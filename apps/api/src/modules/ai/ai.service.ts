import { Injectable } from '@nestjs/common';
import { prisma, newId } from '@learn/db';
import type { GenerateLessonsInput } from '@learn/contracts';
import { ApiError } from '../../common/errors';
import { QueueService } from '../../common/services';
import { UsageService } from '../subscriptions/usage.service';

type AIJobTypeName = 'EXTRACT_DOCUMENT' | 'GENERATE_LESSONS' | 'REGENERATE_LESSON';

interface JobLike {
  id: string;
  courseId: string;
  documentId: string | null;
  type: AIJobTypeName;
  status: string;
  progress: number;
  progressLabel: string | null;
  error: unknown;
  attempt: number;
  inputParams: unknown;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

@Injectable()
export class AiService {
  constructor(
    private readonly usage: UsageService,
    private readonly queue: QueueService,
  ) {}

  /** Tạo job sinh bài học — HANDBOOK §8.2. Idempotent theo (courseId, inputParams) khi tạo. */
  async generateLessons(userId: string, courseId: string, input: GenerateLessonsInput) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, ownerId: userId, deletedAt: null },
    });
    if (!course) throw ApiError.notFound('Không tìm thấy khóa học.');
    if (input.documentIds?.length) {
      // Phải lọc theo CẢ `courseId` lẫn `uploaderId`. Bản trước chỉ lọc `uploaderId`, nên
      // người dùng truyền được id tài liệu của khoá học KHÁC của chính mình vào job này —
      // đúng thông điệp lỗi đang hứa ("không thuộc khóa học của bạn") thì lại không kiểm.
      // Hệ quả: bài học của khoá A sinh ra từ nội dung khoá B.
      const owned = await prisma.document.count({
        where: { id: { in: input.documentIds }, uploaderId: userId, courseId },
      });
      // `count` trên tập id đã khử trùng lặp; so với Set để id lặp lại không làm lệch kết quả.
      if (owned !== new Set(input.documentIds).size)
        throw ApiError.notFound('Có tài liệu không thuộc khóa học của bạn.');
    }

    const params = {
      documentIds: input.documentIds ?? [],
      language: input.language ?? course.language,
      difficulty: input.difficulty ?? 'MEDIUM',
    };

    // Chống nộp trùng: một job đang chạy cho course+params. Đọc ngoài transaction là đủ —
    // đây là đường tắt cho trường hợp thường gặp (bấm nút hai lần), không phải hàng rào.
    const existing = await prisma.aIJob.findFirst({
      where: {
        courseId,
        requestedById: userId,
        type: 'GENERATE_LESSONS',
        status: { in: ['QUEUED', 'RUNNING'] },
        inputParams: { equals: params as never },
      },
    });
    if (existing) return this.summary(existing);

    // Tạo job và trừ hạn mức trong cùng một transaction. Đẩy vào BullMQ **sau** khi commit:
    // một job trong queue trỏ tới AIJob vừa bị rollback sẽ chạy rồi tự bỏ qua, nhưng vẫn tốn
    // một vòng worker và một dòng log khó hiểu.
    const job = await this.usage.consume(userId, 'AI_JOBS_RUN', (tx) =>
      tx.aIJob.create({
        data: {
          id: newId(),
          courseId,
          requestedById: userId,
          type: 'GENERATE_LESSONS',
          // Không dùng key cố định theo course+params mãi mãi — job cũ SUCCEEDED/FAILED/CANCELLED
          // thì đây là lượt sinh MỚI, hợp lệ, phải tạo được job mới. Việc chống nộp trùng thật sự
          // nằm ở truy vấn `existing` phía trên (chỉ chặn khi có job QUEUED/RUNNING);
          // `idempotencyKey` chỉ cần duy nhất trong cùng một khoảnh khắc.
          idempotencyKey: `gen:${courseId}:${JSON.stringify(params)}:${Date.now()}`,
          inputParams: params as never,
          queuedAt: new Date(),
        },
      }),
    );

    await this.queue.lessonGenerate.add(
      'GENERATE_LESSONS',
      { aiJobId: job.id, courseId, userId, params },
      { jobId: `gen-${job.id}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return this.summary(job);
  }

  async getJob(userId: string, jobId: string) {
    const job = await prisma.aIJob.findFirst({ where: { id: jobId, requestedById: userId } });
    if (!job) throw ApiError.notFound('Không tìm thấy job.');
    return this.detail(job);
  }

  /**
   * Huỷ job đang QUEUED/RUNNING. Đặt status=CANCELLED nguyên tử (chỉ khi còn ở 2 trạng thái đó) rồi
   * để worker tự dừng ở điểm kiểm tra gần nhất (`assertNotCancelled`/`isCancelled` trong processor) —
   * không giết tiến trình worker giữa chừng, tránh ghi dở dữ liệu.
   */
  async cancelJob(userId: string, jobId: string) {
    // Một câu UPDATE có điều kiện thay cho find → updateMany → findUniqueOrThrow (3 lượt).
    // Lọc `requestedById` ngay trong `where` nên vẫn chống IDOR ở tầng truy vấn.
    const cancelled = await prisma.aIJob
      .update({
        where: { id: jobId, requestedById: userId, status: { in: ['QUEUED', 'RUNNING'] } },
        data: { status: 'CANCELLED' },
      })
      .catch(() => null);

    if (!cancelled) {
      // Không huỷ được: phân biệt "không tồn tại/không phải của bạn" với "sai trạng thái".
      const exists = await prisma.aIJob.findFirst({
        where: { id: jobId, requestedById: userId },
        select: { id: true },
      });
      if (!exists) throw ApiError.notFound('Không tìm thấy job.');
      throw ApiError.conflict('Chỉ có thể huỷ job đang xếp hàng hoặc đang chạy.');
    }

    // Nếu worker chưa kịp nhận job (vẫn còn nguyên trong BullMQ), gỡ luôn khỏi hàng đợi —
    // best-effort: nếu job đã bắt đầu chạy thì gỡ sẽ không có gì để gỡ, không sao.
    try {
      const bullJob = await this.queue.lessonGenerate.getJob(`gen-${jobId}`);
      if (bullJob) await bullJob.remove();
    } catch {
      // Job không còn trong queue (đã chạy/xong) — bỏ qua.
    }

    return this.summary(cancelled);
  }

  async listJobs(userId: string, courseId?: string) {
    const jobs = await prisma.aIJob.findMany({
      where: { requestedById: userId, ...(courseId ? { courseId } : {}) },
      orderBy: { queuedAt: 'desc' },
      take: 50,
    });
    return { jobs: jobs.map((j) => this.summary(j)) };
  }

  async summary(job: JobLike) {
    return {
      id: job.id,
      courseId: job.courseId,
      documentId: job.documentId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      progressLabel: job.progressLabel,
      error: job.error as { code: string; message: string; detail: unknown } | null,
      queuedAt: job.queuedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
    };
  }

  private async detail(job: JobLike) {
    const runs = await prisma.generationRun.findMany({
      where: { aiJobId: job.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    return {
      ...(await this.summary(job)),
      attempt: job.attempt,
      inputParams: (job.inputParams ?? {}) as Record<string, unknown>,
      runs: runs.map((r) => ({
        id: r.id,
        step: r.step,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        latencyMs: r.latencyMs,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
