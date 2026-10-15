import type { ExerciseRead, SubmitExerciseInput } from '@/contracts';

export type Question = ExerciseRead['questions'][number];
export type QuestionType = Question['type'];
export type Answer = SubmitExerciseInput['answers'][number];
export type AnswerState = Record<string, Answer>;

/**
 * Đáp án đúng chỉ tồn tại trong `SubmissionResult` — tức là chỉ sau khi nộp bài `[SPEC]`. Kiểu từ
 * API là `unknown` (`{ optionId?, value?, acceptable? }`), bóc tách phòng thủ như web.
 */
export function describeCorrect(q: Question, correct: unknown): string | null {
  if (correct === null || typeof correct !== 'object') return null;
  const c = correct as { optionId?: unknown; value?: unknown; acceptable?: unknown };
  if (q.type === 'MULTIPLE_CHOICE' && typeof c.optionId === 'string') {
    const opt = q.options.find((o) => o.id === c.optionId);
    return opt ? `${opt.label}. ${opt.content}` : null;
  }
  if (q.type === 'TRUE_FALSE' && typeof c.value === 'boolean') return c.value ? 'Đúng' : 'Sai';
  if (Array.isArray(c.acceptable)) {
    const list = c.acceptable.filter((x): x is string => typeof x === 'string');
    return list.length > 0 ? list.join(' · ') : null;
  }
  return null;
}

export function correctOptionId(correct: unknown): string | null {
  if (correct === null || typeof correct !== 'object') return null;
  const id = (correct as { optionId?: unknown }).optionId;
  return typeof id === 'string' ? id : null;
}

export function describeGiven(q: Question, a: Answer | undefined): string | null {
  if (!a) return null;
  if (a.type === 'MULTIPLE_CHOICE') {
    const opt = q.options.find((o) => o.id === a.optionId);
    return opt ? `${opt.label}. ${opt.content}` : null;
  }
  if (a.type === 'TRUE_FALSE') return a.value ? 'Đúng' : 'Sai';
  return a.text;
}

/** Bước kế tiếp sau khi nộp: bài tập chưa đạt sau bài hiện tại, rồi quay vòng về đầu. */
export function nextUnpassedExercise(data: Pick<ExerciseRead, 'id' | 'exercises'>) {
  // Loại bài tập hiện tại khỏi ứng viên — `data.exercises` có thể chưa kịp làm mới sau lượt nộp.
  const position = data.exercises.findIndex((e) => e.id === data.id);
  return (
    data.exercises.slice(position + 1).find((e) => !e.passed) ??
    data.exercises.slice(0, Math.max(position, 0)).find((e) => !e.passed)
  );
}
