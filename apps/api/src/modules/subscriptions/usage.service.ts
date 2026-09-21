import { Injectable } from '@nestjs/common';
import { prisma, newId, Prisma } from '@learn/db';
import { ApiError } from '../../common/errors';

export type UsageMetricKey =
  'COURSES_CREATED' | 'DOCUMENTS_UPLOADED' | 'PAGES_PROCESSED' | 'AI_JOBS_RUN';

export interface LimitConfig {
  limit: number;
  window: 'total' | 'month' | 'per_document';
}

interface PlanLike {
  code: string;
  name: string;
  priceCents: number;
  isFutureExtension?: boolean;
  limits: Record<string, LimitConfig>;
}

const FALLBACK_PLAN: PlanLike = { code: 'FREE', name: 'Free', priceCents: 0, limits: {} };

/**
 * Mỗi metric lấy số "đã dùng" từ đâu:
 *
 * - `derived` — đếm thẳng số dòng thật. Xoá một khoá học là trả lại một suất, đúng với window
 *   `total`. Bộ đếm `UsageCounter` **không** phải nguồn sự thật cho nhóm này nên không ghi vào
 *   (bản trước vẫn `increment()` một bộ đếm theo tháng mà không ai đọc — việc thừa, và gây hiểu
 *   nhầm là hạn mức reset hàng tháng).
 * - `counter` — cộng dồn vào `UsageCounter` theo kỳ tháng. Không trả lại khi xoá.
 * - `per_document` — không có tổng hợp; chặn theo từng tài liệu ở worker.
 */
const USAGE_SOURCE: Record<UsageMetricKey, 'derived' | 'counter' | 'per_document'> = {
  COURSES_CREATED: 'derived',
  DOCUMENTS_UPLOADED: 'counter',
  AI_JOBS_RUN: 'counter',
  PAGES_PROCESSED: 'per_document',
};

/** Phần client Prisma mà service này dùng — nhận được cả `prisma` lẫn `tx`. */
type Db = Pick<typeof prisma, 'course' | 'usageCounter' | '$executeRaw'>;

/** Áp hạn mức — HANDBOOK §11.3. */
@Injectable()
export class UsageService {
  async planForUser(userId: string): Promise<PlanLike> {
    // Hai câu độc lập — chạy song song thay vì nối tiếp.
    const [free, sub] = await Promise.all([
      prisma.plan.findFirst({ where: { code: 'FREE', isActive: true } }),
      prisma.subscription.findFirst({
        where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
        orderBy: { updatedAt: 'desc' },
        include: { plan: true },
      }),
    ]);
    return ((sub?.plan ?? free) as PlanLike | null) ?? FALLBACK_PLAN;
  }

  async snapshot(
    userId: string,
  ): Promise<Record<string, { used: number; limit: number | null; window: string }>> {
    const plan = await this.planForUser(userId);
    const keys = Object.keys(plan.limits) as UsageMetricKey[];
    // Bản trước `await` trong vòng `for`, nên N metric = N lượt chờ nối tiếp nhau dù chúng
    // hoàn toàn độc lập.
    const used = await Promise.all(keys.map((key) => this.currentUsage(prisma, userId, key)));

    const out: Record<string, { used: number; limit: number | null; window: string }> = {};
    keys.forEach((key, i) => {
      const cfg = plan.limits[key] as LimitConfig;
      out[key] = { used: used[i] ?? 0, limit: cfg.limit, window: cfg.window };
    });
    return out;
  }

  /**
   * Chạy `work` **bên trong** hạn mức: kiểm tra và ghi nhận trong cùng một transaction.
   *
   * Bản trước là ba bước rời nhau — `assertNotExceeded()` → tạo bản ghi → `increment()`. Đó là
   * kiểm-tra-rồi-hành-động: N request đồng thời đều đọc thấy "còn suất" trước khi bất kỳ ai kịp
   * ghi, nên cả N đều đi qua. Gói FREE giới hạn 3 khoá học vẫn tạo được 10 nếu bấm đủ nhanh.
   *
   * Cách sửa: một transaction giữ **advisory lock theo (userId, metric)**. Lock của Postgres
   * nằm ở tầng transaction nên tự nhả khi commit/rollback, kể cả khi tiến trình chết. Request
   * thứ hai chờ request thứ nhất commit xong mới đọc, nên nó thấy đúng con số đã tăng.
   *
   * Chỉ đặt vào đây thứ chạm DB. Gọi S3 hay đẩy job vào queue phải nằm **sau** khi transaction
   * commit — vừa để không giữ lock qua một lượt gọi mạng, vừa để không bao giờ enqueue một job
   * trỏ tới bản ghi cuối cùng bị rollback.
   */
  async consume<T>(
    userId: string,
    metric: UsageMetricKey,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const plan = await this.planForUser(userId);
      const cfg = plan.limits[metric] as LimitConfig | undefined;

      if (!cfg) return work(tx);

      // Nối tiền tố để hai metric của cùng một người không đụng nhau, và hai người không
      // đụng nhau. `hashtext` cho int4 — thừa đủ cho khoá lock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quota:${userId}:${metric}`}))`;

      const used = await this.currentUsage(tx, userId, metric);
      if (used >= cfg.limit) throw ApiError.quota(cfg.limit, used, metric);

      const result = await work(tx);
      await this.record(tx, userId, metric);
      return result;
    });
  }

  /** Kiểm tra trước khi bắt đầu, không ghi nhận gì. Dùng cho màn hình xem trước / cảnh báo sớm. */
  async assertNotExceeded(
    userId: string,
    metric: UsageMetricKey,
  ): Promise<LimitConfig | undefined> {
    const plan = await this.planForUser(userId);
    const cfg = plan.limits[metric] as LimitConfig | undefined;
    if (!cfg) return undefined;
    const used = await this.currentUsage(prisma, userId, metric);
    if (used >= cfg.limit) throw ApiError.quota(cfg.limit, used, metric);
    return cfg;
  }

  /** Ghi nhận một đơn vị đã dùng. Chỉ có tác dụng với metric kiểu `counter`. */
  private async record(db: Db, userId: string, metric: UsageMetricKey): Promise<void> {
    if (USAGE_SOURCE[metric] !== 'counter') return;
    const period = currentPeriod();
    await db.usageCounter.upsert({
      where: { userId_period_metric: { userId, period, metric } },
      update: { value: { increment: 1 } },
      create: { id: newId(), userId, period, metric, value: 1 },
    });
  }

  private async currentUsage(db: Db, userId: string, metric: UsageMetricKey): Promise<number> {
    switch (USAGE_SOURCE[metric]) {
      case 'derived':
        return db.course.count({ where: { ownerId: userId, deletedAt: null } });

      // `PAGES_PROCESSED` có window "per_document" — không có "used" tổng hợp để so hợp lý.
      // Enforce thật ở apps/worker/src/processors/document-extract.processor.ts, chặn theo TỪNG
      // tài liệu ngay sau khi biết `pageCount` thật (không thể biết trước lúc xin presigned URL).
      // Trả 0 ở đây chỉ để không phá `snapshot()` hiển thị usage bar trong Settings.
      case 'per_document':
        return 0;

      default: {
        const row = await db.usageCounter.findUnique({
          where: { userId_period_metric: { userId, period: currentPeriod(), metric } },
        });
        return row?.value ?? 0;
      }
    }
  }
}

export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
