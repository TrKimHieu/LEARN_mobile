import { Injectable } from '@nestjs/common';
import { prisma, newId, Prisma } from '@learn/db';
import type { ExerciseRead, SubmitExerciseInput, SubmissionResult } from '@learn/contracts';
import { ApiError } from '../../common/errors';

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: unknown;
  explanation: string | null;
  pointsEarned: number;
}

export interface GradedResult {
  score: number;
  maxScore: number;
  passed: boolean;
  percent: number;
  results: GradedAnswer[];
}

type SubmittedAnswer = SubmitExerciseInput['answers'][number];

/** Điểm luôn quy về thang 100 khi lưu Submission — đọc ở progress/courses service. */
const SCORE_SCALE = 100;

/** Số lần thử lại khi hai lượt nộp song song giành cùng `attemptNo`. */
const ATTEMPT_CONFLICT_RETRIES = 3;

const isUniqueViolation = (e: unknown): boolean =>
  !!e && typeof e === 'object' && (e as { code?: unknown }).code === 'P2002';

@Injectable()
export class ExercisesService {
  async getExerciseRead(userId: string, lessonId: string): Promise<ExerciseRead> {
    await this.assertLessonAccess(userId, lessonId);
    const exercise = await prisma.exercise.findFirst({
      where: { lessonId },
      orderBy: { orderIndex: 'asc' },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: { options: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });
    if (!exercise) throw ApiError.notFound('Không có bài tập cho bài học này.');

    const best = await prisma.submission.findFirst({
      where: { userId, exerciseId: exercise.id },
      orderBy: { attemptNo: 'desc' },
    });

    return {
      id: exercise.id,
      title: exercise.title,
      instruction: exercise.instruction,
      difficulty: exercise.difficulty as ExerciseRead['difficulty'],
      passScore: exercise.passScore,
      orderIndex: exercise.orderIndex,
      questions: exercise.questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        type: q.type as ExerciseRead['questions'][number]['type'],
        prompt: q.prompt,
        points: q.points,
        // KHÔNG lộ isCorrect / correctAnswer trước khi nộp `[SPEC]`
        options: q.options.map((o) => ({
          id: o.id,
          orderIndex: o.orderIndex,
          label: o.label,
          content: o.content,
        })),
      })),
      bestSubmission: best
        ? {
            attemptNo: best.attemptNo,
            score: best.score,
            maxScore: best.maxScore,
            createdAt: best.createdAt.toISOString(),
          }
        : null,
    };
  }

  /** Chấm điểm ngay tại server, lưu 1 bản ghi, trả kết quả kèm đáp án — HANDBOOK §7.4. */
  async submit(
    userId: string,
    lessonId: string,
    input: SubmitExerciseInput,
  ): Promise<SubmissionResult> {
    const lesson = await this.assertLessonAccess(userId, lessonId);
    const exercise = await prisma.exercise.findFirst({
      where: { lessonId },
      orderBy: { orderIndex: 'asc' },
      include: {
        questions: { orderBy: { orderIndex: 'asc' }, include: { options: true } },
      },
    });
    if (!exercise) throw ApiError.notFound('Không có bài tập cho bài học này.');

    const questions = exercise.questions;
    // Chống gian lận: mọi questionId phải thuộc exercise này.
    const questionIds = new Set(questions.map((q) => q.id));
    for (const a of input.answers) {
      if (!questionIds.has(a.questionId)) throw ApiError.badRequest('Câu hỏi không thuộc bài tập.');
    }

    // Một Map dựng một lần, thay cho `input.answers.find()` lặp lại trong hai vòng lặp
    // riêng biệt (O(số câu hỏi × số đáp án) mỗi lượt nộp).
    const answerByQuestion = new Map<string, SubmittedAnswer>(
      input.answers.map((a) => [a.questionId, a]),
    );

    const { results, percent, passed } = gradeSubmission(questions, answerByQuestion, {
      passScore: exercise.passScore,
    });

    const created = await this.persistSubmission({
      userId,
      courseId: lesson.courseId,
      lessonId,
      exerciseId: exercise.id,
      percent,
      passed,
      durationMs: input.durationMs ?? null,
      results,
      answerByQuestion,
    });

    return {
      id: created.id,
      attemptNo: created.attemptNo,
      score: percent,
      maxScore: SCORE_SCALE,
      passed,
      createdAt: created.createdAt.toISOString(),
      results,
    };
  }

  /**
   * Ghi Submission + SubmissionAnswer + LearningProgress trong MỘT transaction.
   *
   * Hai lỗi thật đã sửa ở đây:
   *
   * 1. `attemptNo` trước đây được tính bằng `aggregate(_max)` **ngoài** transaction rồi `+1`.
   *    Hai lượt nộp song song (bấm "Nộp bài" hai lần, hoặc tab đôi) đọc cùng một `_max` nên
   *    cùng chọn một `attemptNo`, đụng `@@unique([userId, exerciseId, attemptNo])`. Lỗi Prisma
   *    P2002 khi đó rơi vào nhánh fallback của error filter và trả **500** — người dùng mất
   *    bài làm. Nay tính trong transaction và thử lại khi đụng khoá: lượt thứ hai nhận
   *    `attemptNo` kế tiếp thay vì lỗi.
   *
   * 2. `upsertProgress()` nhận `tx` nhưng gọi `prisma.*` toàn cục, tức là **nằm ngoài**
   *    transaction. Transaction rollback (ví dụ một `submissionAnswer` lỗi) vẫn để lại
   *    LearningProgress đã ghi — bài học hiện "Hoàn thành" mà không có Submission nào.
   */
  private async persistSubmission(args: {
    userId: string;
    courseId: string;
    lessonId: string;
    exerciseId: string;
    percent: number;
    passed: boolean;
    durationMs: number | null;
    results: GradedAnswer[];
    answerByQuestion: Map<string, SubmittedAnswer>;
  }): Promise<{ id: string; attemptNo: number; createdAt: Date }> {
    for (let retry = 0; ; retry++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const previous = await tx.submission.aggregate({
            where: { userId: args.userId, exerciseId: args.exerciseId },
            _max: { attemptNo: true },
          });
          const attemptNo = (previous._max.attemptNo ?? 0) + 1;
          const id = newId();

          const submission = await tx.submission.create({
            data: {
              id,
              userId: args.userId,
              exerciseId: args.exerciseId,
              attemptNo,
              score: args.percent,
              maxScore: SCORE_SCALE,
              durationMs: args.durationMs,
            },
          });

          // Một INSERT nhiều dòng thay cho N round-trip tuần tự trong transaction.
          await tx.submissionAnswer.createMany({
            data: args.results.map((r) => ({
              id: newId(),
              submissionId: id,
              questionId: r.questionId,
              rawAnswer: rawAnswerOf(args.answerByQuestion.get(r.questionId)),
              isCorrect: r.isCorrect,
              pointsEarned: r.pointsEarned,
              feedback: r.explanation,
            })),
          });

          await this.upsertProgress(tx, args);

          return { id, attemptNo, createdAt: submission.createdAt };
        });
      } catch (e) {
        if (isUniqueViolation(e) && retry < ATTEMPT_CONFLICT_RETRIES) continue;
        throw e;
      }
    }
  }

  /** Cập nhật tiến độ — chạy TRONG transaction của `persistSubmission`. */
  private async upsertProgress(
    tx: Pick<typeof prisma, 'learningProgress'>,
    args: {
      userId: string;
      courseId: string;
      lessonId: string;
      percent: number;
      passed: boolean;
    },
  ): Promise<void> {
    const { userId, courseId, lessonId, percent, passed } = args;
    const now = new Date();
    const existing = await tx.learningProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, bestScore: true, completedAt: true },
    });

    await tx.learningProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        id: newId(),
        userId,
        courseId,
        lessonId,
        status: passed ? 'COMPLETED' : 'IN_PROGRESS',
        bestScore: percent,
        attempts: 1,
        startedAt: now,
        completedAt: passed ? now : null,
      },
      update: {
        // Đã COMPLETED thì không hạ cấp khi làm lại và trượt.
        status: passed || existing?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        bestScore: Math.max(existing?.bestScore ?? 0, percent),
        // `increment` để hai lượt nộp song song không ghi đè bộ đếm của nhau
        // (đọc-rồi-ghi `existing.attempts + 1` làm mất một lượt).
        attempts: { increment: 1 },
        completedAt: passed ? (existing?.completedAt ?? now) : existing?.completedAt,
      },
    });
  }

  private async assertLessonAccess(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null, course: { ownerId: userId, deletedAt: null } },
      select: { id: true, courseId: true },
    });
    if (!lesson) throw ApiError.notFound('Không tìm thấy bài học.');
    return lesson;
  }
}

/** Hình dạng `rawAnswer` lưu xuống DB, theo từng loại câu hỏi. */
function rawAnswerOf(answer: SubmittedAnswer | undefined): Prisma.InputJsonValue {
  if (!answer) return {};
  switch (answer.type) {
    case 'MULTIPLE_CHOICE':
      return { optionId: answer.optionId };
    case 'TRUE_FALSE':
      return { value: answer.value };
    default:
      return { text: 'text' in answer ? answer.text : '' };
  }
}

interface GradableQuestion {
  id: string;
  type: string;
  points: number;
  correctAnswer: unknown;
  explanation: string | null;
  options: Array<{ id: string; isCorrect: boolean }>;
}

/**
 * Chấm trọn một lượt nộp. Hàm thuần — không chạm DB nên unit-test được trực tiếp.
 * Câu không trả lời tính 0 điểm nhưng vẫn xuất hiện trong `results` kèm đáp án đúng.
 */
export function gradeSubmission(
  questions: GradableQuestion[],
  answerByQuestion: Map<string, SubmittedAnswer>,
  opts: { passScore: number },
): { results: GradedAnswer[]; percent: number; passed: boolean } {
  // `|| 1` chặn chia cho 0 khi bài tập không có câu hỏi nào có điểm.
  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0) || 1;
  let pointsEarned = 0;

  const results: GradedAnswer[] = questions.map((q) => {
    const answer = answerByQuestion.get(q.id);
    const isCorrect = answer ? gradeAnswer(q, answer).isCorrect : false;
    if (isCorrect) pointsEarned += q.points;
    return {
      questionId: q.id,
      isCorrect,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      pointsEarned: isCorrect ? q.points : 0,
    };
  });

  const percent = Math.round((pointsEarned / maxPoints) * SCORE_SCALE);
  return { results, percent, passed: percent >= opts.passScore };
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?)]+$/g, '');
}

/** Chấm điểm 1 câu hỏi dựa trên type — logic thuần để unit-test. `[SPEC]` HANDBOOK §7.4. */
export function gradeAnswer(
  q: {
    id: string;
    type: string;
    correctAnswer: unknown;
    options: Array<{ id: string; isCorrect: boolean }>;
  },
  answer: SubmittedAnswer,
): { isCorrect: boolean } {
  const correct = q.correctAnswer as { optionId?: string; value?: boolean; acceptable?: string[] };
  switch (q.type) {
    case 'MULTIPLE_CHOICE':
      if (answer.type !== 'MULTIPLE_CHOICE') return { isCorrect: false };
      return { isCorrect: q.options.some((o) => o.id === answer.optionId && o.isCorrect) };
    case 'TRUE_FALSE':
      if (answer.type !== 'TRUE_FALSE') return { isCorrect: false };
      return { isCorrect: correct.value === answer.value };
    case 'SHORT_ANSWER':
    case 'FILL_BLANK':
      if (answer.type !== 'SHORT_ANSWER' && answer.type !== 'FILL_BLANK')
        return { isCorrect: false };
      return {
        isCorrect: (correct.acceptable ?? []).map(normalize).includes(normalize(answer.text)),
      };
    default:
      return { isCorrect: false };
  }
}
