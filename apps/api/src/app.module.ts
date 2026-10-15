import { Module } from '@nestjs/common';
import { CommonModule } from './common/services';
import { SecurityModule } from './common/security.module';
import { HealthModule } from './modules/health/health.module';
import { MetaModule } from './modules/meta/meta.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { LearningModule } from './modules/learning/learning.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    CommonModule,
    SecurityModule,
    HealthModule,
    MetaModule,
    AuthModule,
    CoursesModule,
    DocumentsModule,
    LearningModule,
    SubscriptionsModule,
    AiModule,
    AdminModule,
  ],
})
export class AppModule {}
