import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { prisma, newId, Prisma } from '@learn/db';
import { ApiError } from '../../common/errors';
import { QueueService } from '../../common/services';
import { Admin, AdminContext } from './admin.decorators';

@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly queue: QueueService) {}
  @Get('metrics')
  @Admin()
  async metrics(@AdminContext() admin: AdminContext) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 86400_000);

    const [users, usersToday, courses, documents, jobs, jobsToday, submissions, cost] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
        prisma.course.count({ where: { deletedAt: null } }),
        prisma.document.count(),
        prisma.aIJob.count(),
        prisma.aIJob.count({ where: { queuedAt: { gte: today } } }),
        prisma.submission.count(),
        prisma.generationRun.aggregate({ _sum: { costUsd: true } }),
      ]);
    // Prisma groupBy trên `createdAt` (timestamp chính xác đến ms) gần như không gộp được dòng nào —
    // phải tự gộp theo ngày (UTC) ở tầng ứng dụng cho đúng "biểu đồ chi phí LLM theo ngày" (checklist admin).
    const runs = await prisma.generationRun.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: {
        createdAt: true,
        costUsd: true,
        inputTokens: true,
        outputTokens: true,
        aiJobId: true,
      },
    });
    const byDay = new Map<
      string,
      {
        totalCostUsd: number;
        jobIds: Set<string>;
        totalInputTokens: number;
        totalOutputTokens: number;
      }
    >();
    for (const r of runs) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? {
        totalCostUsd: 0,
        jobIds: new Set<string>(),
        totalInputTokens: 0,
        totalOutputTokens: 0,
      };
      bucket.totalCostUsd += Number(r.costUsd);
      bucket.jobIds.add(r.aiJobId);
      bucket.totalInputTokens += r.inputTokens;
      bucket.totalOutputTokens += r.outputTokens;
      byDay.set(day, bucket);
    }
    const dailyCosts = Array.from(byDay.entries())
      .map(([date, b]) => ({
        date,
        totalCostUsd: Math.round(b.totalCostUsd * 1e6) / 1e6,
        jobCount: b.jobIds.size,
        totalInputTokens: b.totalInputTokens,
        totalOutputTokens: b.totalOutputTokens,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    void admin;
    return {
      generatedAt: new Date().toISOString(),
      totals: {
        users,
        usersToday,
        courses,
        documents,
        aiJobs: jobs,
        aiJobsToday: jobsToday,
        submissions,
        totalCostUsd: Number(cost._sum.costUsd ?? 0),
      },
      dailyCosts,
    };
  }

  @Get('users')
  @Admin()
  async users(@Query('q') q?: string) {
    const rows = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(q ? { email: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: { select: { courses: { where: { deletedAt: null } } } },
      },
    });
    return {
      users: rows.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        locale: u.locale as 'vi' | 'en',
        emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        courseCount: u._count.courses,
        subscriptionCode: u.subscriptions[0]?.plan.code ?? null,
      })),
    };
  }

  @Get('courses')
  @Admin()
  async courses(@Query('q') q?: string) {
    const rows = await prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        owner: { select: { email: true } },
        _count: { select: { lessons: { where: { deletedAt: null } }, documents: true } },
      },
    });
    return {
      courses: rows.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        language: c.language,
        status: c.status,
        progress: { completed: 0, total: c._count.lessons },
        documentCount: c._count.documents,
        lessonCount: c._count.lessons,
        updatedAt: c.updatedAt.toISOString(),
        ownerEmail: c.owner.email,
      })),
    };
  }

  @Get('subscriptions')
  @Admin()
  async subscriptions() {
    const rows = await prisma.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { plan: true, user: { select: { email: true } } },
    });
    return {
      subscriptions: rows.map((s) => ({
        userId: s.userId,
        email: s.user.email,
        planCode: s.plan.code,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
      })),
    };
  }

  @Get('ai-jobs')
  @Admin()
  async aiJobs(@Query('status') status?: string) {
    const rows = await prisma.aIJob.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { queuedAt: 'desc' },
      take: 100,
      include: { course: { select: { title: true } }, requester: { select: { email: true } } },
    });
    return {
      jobs: rows.map((j) => ({
        id: j.id,
        courseId: j.courseId,
        documentId: j.documentId,
        type: j.type,
        status: j.status,
        progress: j.progress,
        progressLabel: j.progressLabel,
        error: j.error,
        queuedAt: j.queuedAt.toISOString(),
        startedAt: j.startedAt?.toISOString() ?? null,
        finishedAt: j.finishedAt?.toISOString() ?? null,
        courseTitle: j.course.title,
        requesterEmail: j.requester.email,
      })),
    };
  }

  @Get('ai-jobs/:id')
  @Admin()
  async aiJobDetail(@Param('id') id: string) {
    const job = await prisma.aIJob.findUnique({
      where: { id },
      include: { course: { select: { title: true } }, requester: { select: { email: true } } },
    });
    if (!job) throw ApiError.notFound('Không tìm thấy AI job.');
    const runs = await prisma.generationRun.findMany({
      where: { aiJobId: job.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    return {
      id: job.id,
      courseId: job.courseId,
      documentId: job.documentId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      progressLabel: job.progressLabel,
      error: job.error,
      queuedAt: job.queuedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      attempt: job.attempt,
      inputParams: (job.inputParams ?? {}) as Record<string, unknown>,
      courseTitle: job.course.title,
      requesterEmail: job.requester.email,
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

  /** Chạy lại job thất bại — chỉ hỗ trợ GENERATE_LESSONS (loại duy nhất thật sự tạo bản ghi AIJob;
   * EXTRACT_DOCUMENT chạy qua queue riêng theo Document.status, không có bản ghi AIJob). Ghi AuditLog. */
  @Post('ai-jobs/:id/retry')
  @Admin()
  async retryAiJob(@Param('id') id: string, @AdminContext() admin: AdminContext) {
    const job = await prisma.aIJob.findUnique({ where: { id } });
    if (!job) throw ApiError.notFound('Không tìm thấy AI job.');
    if (job.status !== 'FAILED')
      throw ApiError.conflict('Chỉ có thể chạy lại job đang ở trạng thái thất bại.');
    if (job.type !== 'GENERATE_LESSONS')
      throw ApiError.badRequest(`Chưa hỗ trợ chạy lại job loại ${job.type}.`);

    const previousError = job.error;
    const updated = await prisma.aIJob.update({
      where: { id: job.id },
      data: {
        status: 'QUEUED',
        progress: 0,
        progressLabel: null,
        error: Prisma.DbNull,
        startedAt: null,
        finishedAt: null,
      },
    });

    const params = job.inputParams as {
      documentIds: string[];
      language: 'vi' | 'en';
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    };
    await this.queue.lessonGenerate.add(
      'GENERATE_LESSONS',
      { aiJobId: job.id, courseId: job.courseId, userId: job.requestedById, params },
      {
        jobId: `gen-${job.id}-retry-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    await prisma.auditLog.create({
      data: {
        id: newId(),
        actorId: admin.adminId,
        action: 'ai_job.retry',
        entityType: 'AIJob',
        entityId: job.id,
        metadata: { previousStatus: 'FAILED', previousError } as never,
      },
    });

    return {
      id: updated.id,
      courseId: updated.courseId,
      documentId: updated.documentId,
      type: updated.type,
      status: updated.status,
      progress: updated.progress,
      progressLabel: updated.progressLabel,
      error: updated.error,
      queuedAt: updated.queuedAt.toISOString(),
      startedAt: updated.startedAt?.toISOString() ?? null,
      finishedAt: updated.finishedAt?.toISOString() ?? null,
    };
  }

  @Get('ai-jobs/:id/audit-log')
  @Admin()
  async aiJobAuditLog(@Param('id') id: string) {
    const rows = await prisma.auditLog.findMany({
      where: { entityType: 'AIJob', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: { select: { email: true } } },
    });
    return {
      entries: rows.map((r) => ({
        id: r.id,
        actorEmail: r.actor?.email ?? null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
