import { z } from 'zod';
import { userPublicSchema } from './auth';
import { courseSummarySchema } from './course';
import { aiJobSummarySchema, aiJobDetailSchema } from './ai';

export const adminUserSchema = userPublicSchema.extend({
  courseCount: z.number().int(),
  subscriptionCode: z.string().nullable(),
  createdAt: z.string(),
});

export const adminCourseSchema = courseSummarySchema.extend({
  ownerEmail: z.string(),
});

export const adminSubscriptionSchema = z.object({
  userId: z.string(),
  email: z.string(),
  planCode: z.string(),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED']),
  currentPeriodEnd: z.string().nullable(),
});

export const adminAiJobListSchema = aiJobSummarySchema.extend({
  courseTitle: z.string(),
  requesterEmail: z.string(),
});

export const adminAiJobDetailSchema = aiJobDetailSchema.extend({
  courseTitle: z.string(),
  requesterEmail: z.string(),
});

export const auditLogEntrySchema = z.object({
  id: z.string(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminCourse = z.infer<typeof adminCourseSchema>;
export type AdminSubscription = z.infer<typeof adminSubscriptionSchema>;
export type AdminAiJobList = z.infer<typeof adminAiJobListSchema>;
export type AdminAiJobDetail = z.infer<typeof adminAiJobDetailSchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
