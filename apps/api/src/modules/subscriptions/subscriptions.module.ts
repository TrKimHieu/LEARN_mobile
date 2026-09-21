import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { UsageService } from './usage.service';
import { BillingService } from './billing.service';

@Module({
  controllers: [SubscriptionController],
  providers: [UsageService, BillingService],
  exports: [UsageService],
})
export class SubscriptionsModule {}
