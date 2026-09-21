import { Injectable } from '@nestjs/common';
import { prisma, newId } from '@learn/db';
import type {
  CourseStatus,
  CreateCourseInput,
  PatchCourseInput,
  CourseSummary,
  CourseDetail,
} from '@learn/contracts';
import { ApiError } from '../../common/errors';
import { UsageService } from '../subscriptions/usage.service';

/** Cột của Course mà cả `toSummary` lẫn `toDetail` cần — tránh truyền 7 tham số rời. */
interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  language: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CoursesService {
  constructor(private readonly usage: UsageService) {}

  /**
   * Danh sách khoá học của một người.
   *
   * Trước đây mỗi khoá học gọi `toSummary()`, và mỗi `toSummary()` bắn 3 câu COUNT riêng
   * (lesson, document, progress) — tức `1 + 3N` truy vấn cho N khoá học. 20 khoá học = 61
   * round-trip cho một màn danh sách. `Promise.all` chỉ làm chúng chạy song song, không
   * làm chúng ít đi, và còn mở 3N kết nối cùng lúc trong pool.
   *
   * Nay: 1 câu lấy khoá học + 3 câu `groupBy` gộp cho toàn bộ khoá học = **4 truy vấn cố
   * định**, không phụ thuộc N.
   */
  async listForOwner(userId: string): Promise<Record<'courses', CourseSummary[]>> {
    const courses = await prisma.course.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (courses.length === 0) return { courses: [] };

    const courseIds = courses.map((c) => c.id);
    const [lessonCounts, documentCounts, completedCounts] = await Promise.all([
      prisma.lesson.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.document.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _count: { _all: true },
      }),
      prisma.learningProgress.groupBy({
        by: ['courseId'],
        where: { userId, courseId: { in: courseIds }, status: 'COMPLETED' },
        _count: { _all: true },
      }),
    ]);

    const lessons = countMap(lessonCounts);
    const documents = countMap(documentCounts);
    const completed = countMap(completedCounts);

    return {
      courses: courses.map((c) => {
        const lessonCount = lessons.get(c.id) ?? 0;
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          language: c.language as 'vi' | 'en',
          status: c.status as CourseStatus,
          progress: { completed: completed.get(c.id) ?? 0, total: lessonCount },
          documentCount: documents.get(c.id) ?? 0,
          lessonCount,
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    };
  }

  /**
   * Tạo khoá học trong hạn mức. Kiểm tra và ghi đều nằm trong transaction của
   * `usage.consume()`, nên hai request đồng thời không cùng lọt qua một suất cuối.
   */
  async create(userId: string, input: CreateCourseInput): Promise<CourseDetail> {
    const course = await this.usage.consume(userId, 'COURSES_CREATED', (tx) =>
      tx.course.create({
        data: {
          id: newId(),
          ownerId: userId,
          title: input.title,
          description: input.description ?? null,
          language: input.language as 'vi' | 'en',
        },
      }),
    );
    return this.toDetail(userId, course);
  }

  async patch(userId: string, courseId: string, input: PatchCourseInput): Promise<CourseDetail> {
    await this.assertOwned(courseId, userId);
    // Prisma bỏ qua field `undefined`, nên không cần đọc trước rồi điền lại giá trị cũ —
    // và làm vậy còn ghi đè thay đổi của request song song bằng dữ liệu đã cũ.
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: input.title,
        description: input.description,
        status: input.status as CourseStatus | undefined,
      },
    });
    return this.toDetail(userId, updated);
  }

  async remove(userId: string, courseId: string): Promise<{ ok: true }> {
    await this.assertOwned(courseId, userId);
    await prisma.course.update({ where: { id: courseId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async getDetail(userId: string, courseId: string): Promise<CourseDetail> {
    const course = await this.assertOwned(courseId, userId);
    return this.toDetail(userId, course);
  }

  /** Lọc quyền sở hữu ở tầng truy vấn — chống IDOR (AGENTS.md). */
  private async assertOwned(courseId: string, userId: string): Promise<CourseRow> {
    const course = await prisma.course.findFirst({
      where: { id: courseId, ownerId: userId, deletedAt: null },
    });
    if (!course) throw ApiError.notFound('Không tìm thấy khóa học.');
    return course;
  }

  private async toDetail(userId: string, course: CourseRow): Promise<CourseDetail> {
    const [totalLessons, completedLessons, scores] = await Promise.all([
      prisma.lesson.count({ where: { courseId: course.id, deletedAt: null } }),
      prisma.learningProgress.count({
        where: { userId, courseId: course.id, status: 'COMPLETED' },
      }),
      // `aggregate` để Postgres tính trung bình. Bản trước `findMany` toàn bộ Submission của
      // khoá học về Node rồi `reduce` — bộ nhớ và thời gian tăng tuyến tính theo số lượt nộp,
      // không có giới hạn trên.
      prisma.submission.aggregate({
        where: { userId, exercise: { lesson: { courseId: course.id } } },
        _avg: { score: true },
      }),
    ]);

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      language: course.language as 'vi' | 'en',
      status: course.status as CourseStatus,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      stats: { completedLessons, totalLessons, averageScore: round1(scores._avg.score) },
    };
  }
}

/** `groupBy` → Map<courseId, số dòng>. */
function countMap(
  rows: Array<{ courseId: string; _count: { _all: number } }>,
): Map<string, number> {
  return new Map(rows.map((r) => [r.courseId, r._count._all]));
}

/** Làm tròn 1 chữ số thập phân, giữ `null` khi chưa có dữ liệu. */
export function round1(value: number | null | undefined): number | null {
  return value == null ? null : Math.round(value * 10) / 10;
}
