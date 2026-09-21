import { Injectable } from '@nestjs/common';
import { prisma, newId, Prisma } from '@learn/db';
import type {
  LessonSummary,
  LessonRead,
  PatchLessonInput,
  ReorderLessonsInput,
} from '@learn/contracts';
import { ApiError } from '../../common/errors';

@Injectable()
export class LessonsService {
  async listSummaries(userId: string, courseId: string): Promise<{ lessons: LessonSummary[] }> {
    const course = await this.ownedCourse(courseId, userId);
    const lessons = await prisma.lesson.findMany({
      where: { courseId: course.id, deletedAt: null },
      orderBy: { orderIndex: 'asc' },
    });
    const progress = await prisma.learningProgress.findMany({
      where: { userId, courseId: course.id },
    });
    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
    const exerciseCounts = await prisma.exercise.groupBy({
      by: ['lessonId'],
      where: { lesson: { courseId: course.id } },
      _count: true,
    });
    const countMap = new Map(exerciseCounts.map((c) => [c.lessonId, c._count]));

    return {
      lessons: lessons.map((l) => {
        const p = progressMap.get(l.id);
        return {
          id: l.id,
          title: l.title,
          orderIndex: l.orderIndex,
          status: l.status as LessonSummary['status'],
          exerciseCount: countMap.get(l.id) ?? 0,
          progressStatus: p?.status ?? 'NOT_STARTED',
          bestScore: p?.bestScore ?? null,
        };
      }),
    };
  }

  async getLessonRead(userId: string, courseId: string, lessonId: string): Promise<LessonRead> {
    const course = await this.ownedCourse(courseId, userId);
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId: course.id, deletedAt: null },
    });
    if (!lesson) throw ApiError.notFound('Không tìm thấy bài học.');
    const p = await prisma.learningProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    return {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      contentMd: lesson.contentMd,
      estimatedMinutes: lesson.estimatedMinutes,
      orderIndex: lesson.orderIndex,
      status: lesson.status as LessonRead['status'],
      sourceChunkIds: lesson.sourceChunkIds,
      editedByUserAt: lesson.editedByUserAt?.toISOString() ?? null,
      progress: {
        status: p?.status ?? 'NOT_STARTED',
        bestScore: p?.bestScore ?? null,
      },
    };
  }

  /** Sửa nội dung Lesson — HANDBOOK §7.2 `PATCH /lessons/:id`, user story C-01. */
  async patchLesson(
    userId: string,
    courseId: string,
    lessonId: string,
    input: PatchLessonInput,
  ): Promise<LessonRead> {
    const course = await this.ownedCourse(courseId, userId);
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId: course.id, deletedAt: null },
    });
    if (!lesson) throw ApiError.notFound('Không tìm thấy bài học.');
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        title: input.title ?? lesson.title,
        summary: input.summary !== undefined ? input.summary : lesson.summary,
        contentMd: input.contentMd ?? lesson.contentMd,
        status: input.status ? (input.status as 'DRAFT' | 'PUBLISHED') : lesson.status,
        editedByUserAt: new Date(),
      },
    });
    return this.getLessonRead(userId, courseId, lessonId);
  }

  /**
   * Sắp xếp lại thứ tự Lesson — HANDBOOK §7.2 `PATCH /courses/:id/lessons/reorder`, user story C-02.
   * `lessonIds` phải là hoán vị đầy đủ của toàn bộ Lesson (chưa xoá) trong Course — không cho sắp
   * xếp lại một phần vì `orderIndex` phải liên tục 0..n-1 (đúng `@@unique([courseId, orderIndex])`).
   */
  async reorderLessons(userId: string, courseId: string, input: ReorderLessonsInput) {
    const course = await this.ownedCourse(courseId, userId);
    const existing = await prisma.lesson.findMany({
      where: { courseId: course.id, deletedAt: null },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((l) => l.id));
    const inputIds = new Set(input.lessonIds);
    if (existingIds.size !== inputIds.size || input.lessonIds.some((id) => !existingIds.has(id))) {
      throw ApiError.badRequest(
        'Danh sách lessonIds phải chứa đúng toàn bộ bài học hiện có của khóa học, không thiếu không thừa.',
      );
    }

    await prisma.$transaction(async (tx) => {
      // Vẫn phải đi HAI lượt: `@@unique([courseId, orderIndex])` áp dụng ngay trong câu lệnh, nên
      // gán thẳng 0..n-1 sẽ đụng nhau ở những vị trí hoán đổi. Lượt một đẩy tất cả xuống vùng
      // orderIndex âm (không ai đang dùng), lượt hai kéo lên đúng chỗ.
      //
      // Base phải tính động từ MIN(orderIndex) thật của TOÀN BỘ lesson (kể cả đã xoá mềm) —
      // deleteLesson() có thể đã đẩy một lesson đã xoá xuống orderIndex âm, nếu dùng base cố định
      // `-1-i` như trước sẽ đụng đúng giá trị đó (lỗi 500 thật tìm thấy khi test reorder sau khi
      // xoá 1 lesson).
      //
      // Khác biệt so với bản trước: mỗi lượt giờ là **một** câu `UPDATE … FROM (VALUES …)` thay
      // cho N câu `update()` riêng. Sắp lại 30 bài học từng là 60 round-trip nối tiếp nhau bên
      // trong transaction (`Promise.all` không giúp gì — Prisma dồn chúng qua cùng một kết nối),
      // đủ lâu để chạm mốc hết hạn transaction; nay là 2.
      const { _min } = await tx.lesson.aggregate({
        where: { courseId: course.id },
        _min: { orderIndex: true },
      });
      const tempBase = Math.min(_min.orderIndex ?? 0, 0) - 1;

      await assignOrderIndexes(tx, course.id, input.lessonIds, (i) => tempBase - i);
      await assignOrderIndexes(tx, course.id, input.lessonIds, (i) => i);
    });

    return this.listSummaries(userId, courseId);
  }

  /**
   * Xoá Lesson (soft delete) — HANDBOOK §7.2 `DELETE /lessons/:id`.
   * Đẩy `orderIndex` của Lesson bị xoá xuống dưới mọi giá trị hiện có (kể cả của Lesson đã xoá trước
   * đó) để không đụng `@@unique([courseId, orderIndex])` khi sau này `reorderLessons()` gán lại
   * 0..n-1 cho các Lesson còn hoạt động — Postgres không biết `deletedAt` là soft-delete nên chỉ số
   * unique vẫn áp dụng cho mọi dòng, kể cả dòng đã "xoá".
   */
  async deleteLesson(userId: string, courseId: string, lessonId: string): Promise<{ ok: true }> {
    const course = await this.ownedCourse(courseId, userId);
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId: course.id, deletedAt: null },
    });
    if (!lesson) throw ApiError.notFound('Không tìm thấy bài học.');

    const { _min } = await prisma.lesson.aggregate({
      where: { courseId: course.id },
      _min: { orderIndex: true },
    });
    const safeIndex = Math.min(_min.orderIndex ?? 0, lesson.orderIndex) - 1;

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { deletedAt: new Date(), orderIndex: safeIndex },
    });
    return { ok: true };
  }

  /** Đánh dấu bắt đầu học — HANDBOOK §7.2 `POST /lessons/:id/start`. Idempotent, không hạ cấp COMPLETED. */
  async startLesson(userId: string, courseId: string, lessonId: string) {
    const course = await this.ownedCourse(courseId, userId);
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId: course.id, deletedAt: null },
    });
    if (!lesson) throw ApiError.notFound('Không tìm thấy bài học.');

    const existing = await prisma.learningProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (existing) return { status: existing.status };

    const created = await prisma.learningProgress.create({
      data: {
        id: newId(),
        userId,
        courseId: course.id,
        lessonId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
    return { status: created.status };
  }

  private async ownedCourse(courseId: string, userId: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, ownerId: userId, deletedAt: null },
    });
    if (!course) throw ApiError.notFound('Không tìm thấy khóa học.');
    return course;
  }
}

/**
 * Gán `orderIndex` cho một loạt Lesson bằng **một** câu UPDATE.
 *
 * `courseId` nằm trong `WHERE` chứ không chỉ dựa vào danh sách id: id đã được kiểm là thuộc
 * khoá học ở tầng trên, nhưng ràng buộc lặp lại ở đây khiến câu lệnh tự nó an toàn, không phụ
 * thuộc người gọi kiểm đúng.
 */
async function assignOrderIndexes(
  tx: Prisma.TransactionClient,
  courseId: string,
  lessonIds: string[],
  indexAt: (position: number) => number,
): Promise<void> {
  if (lessonIds.length === 0) return;
  const values = lessonIds.map((id, i) => Prisma.sql`(${id}, ${indexAt(i)})`);
  await tx.$executeRaw`
    UPDATE "Lesson" AS l
    SET "orderIndex" = v.idx
    FROM (VALUES ${Prisma.join(values)}) AS v(id, idx)
    WHERE l.id = v.id AND l."courseId" = ${courseId}
  `;
}
