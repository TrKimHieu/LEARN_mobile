import { Injectable } from '@nestjs/common';
import { prisma, newId } from '@learn/db';
import { env } from '../../environment';
import { ApiError } from '../../common/errors';

/**
 * Billing — HANDBOOK §11.4. Giá luôn lấy từ `Plan.priceCents` trong DB `[SPEC]`.
 * Chế độ demo kích hoạt ngay và ghi Payment giả; UI phải hiển thị băng rôn cảnh báo.
 * Chế độ live dùng Stripe Checkout; webhook là nguồn sự thật (never tin trang redirect).
 */
@Injectable()
export class BillingService {
  async checkout(
    userId: string,
    planCode: string,
  ): Promise<{ url: string; mode: 'demo' | 'live' }> {
    if (env.BILLING_MODE === 'live') {
      return this.checkoutLive(userId, planCode);
    }
    await this.activatePlanDemo(userId, planCode);
    return { url: `${env.APP_URL}/app/settings?upgraded=1`, mode: 'demo' };
  }

  async webhookHandler(
    _userId: string,
    _signature: string,
    _body: string,
  ): Promise<{ ok: boolean }> {
    // Live: xác minh chữ ký Stripe, ghi PaymentEvent trước, chống trùng theo eventId.
    // Với REPO KHÔNG CÓ STRIPE KEY: trả 501 để không "giả vờ" đã tích hợp live.
    throw ApiError.conflict(
      'Webhook Stripe chỉ hoạt động khi BILLING_MODE=live và có STRIPE_WEBHOOK_SECRET.',
    );
  }

  private async activatePlanDemo(userId: string, planCode: string) {
    const plan = await prisma.plan.findFirst({ where: { code: planCode, isActive: true } });
    if (!plan) throw ApiError.notFound('Không tồn tại gói này.');
    if (plan.isFutureExtension) throw ApiError.forbidden('Gói này chưa được bán.');

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
        data: { status: 'CANCELED' },
      });
      const subscription = await tx.subscription.create({
        data: {
          id: newId(),
          userId,
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86400 * 1000),
        },
      });
      await tx.payment.create({
        data: {
          id: newId(),
          subscriptionId: subscription.id,
          amountCents: plan.priceCents,
          currency: plan.currency,
          status: 'succeeded',
          providerPaymentId: `demo_${newId()}`,
          paidAt: now,
        },
      });
    });
  }

  private async checkoutLive(
    userId: string,
    planCode: string,
  ): Promise<{ url: string; mode: 'live' }> {
    const plan = await prisma.plan.findFirst({ where: { code: planCode, isActive: true } });
    if (!plan) throw ApiError.notFound('Không tồn tại gói này.');
    if (!env.STRIPE_SECRET_KEY || !plan.providerPriceId) {
      throw ApiError.conflict('Thanh toán live chưa được cấu hình đầy đủ.');
    }
    // Ở bản repo (redux hạn chế), Stripe SDK không được bundle — chỉ trả URL chờ tích hợp:
    throw ApiError.conflict(
      'Stripe live chỉ thêm khi có STRIPE_SECRET_KEY; chạy với BILLING_MODE=demo để dùng thử.',
    );
  }
}
