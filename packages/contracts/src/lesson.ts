import { z } from 'zod';

export const lessonStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

export const lessonReadSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  contentMd: z.string(),
  estimatedMinutes: z.number().int().nullable(),
  orderIndex: z.number().int(),
  status: lessonStatusSchema,
  sourceChunkIds: z.array(z.string()).default([]),
  editedByUserAt: z.string().nullable(),
  progress: z.object({
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    bestScore: z.number().int().nullable(),
  }),
});

export const lessonSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  orderIndex: z.number().int(),
  status: lessonStatusSchema,
  exerciseCount: z.number().int().default(0),
  progressStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  bestScore: z.number().int().nullable(),
});

export const patchLessonSchema = z
  .object({
    title: z.string().min(5).max(200).optional(),
    summary: z.string().max(500).nullable().optional(),
    contentMd: z.string().min(10).max(12000).optional(),
    status: lessonStatusSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Ít nhất một trường cần sửa' });

export type LessonRead = z.infer<typeof lessonReadSchema>;
export type LessonSummary = z.infer<typeof lessonSummarySchema>;
export type PatchLessonInput = z.infer<typeof patchLessonSchema>;
