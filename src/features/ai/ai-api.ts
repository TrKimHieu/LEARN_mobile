import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AiJobSummary, GenerateLessonsInput } from '@/contracts';
import { apiFetch } from '@/lib/api-client';

const ACTIVE = new Set(['QUEUED', 'RUNNING']);

export function useGenerateLessons(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateLessonsInput = {}) =>
      apiFetch<AiJobSummary>(`/api/v1/ai/courses/${courseId}/generate-lessons`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] });
    },
  });
}

/** Theo dõi 1 AIJob — hỏi lại 2s trong lúc QUEUED/RUNNING (HANDBOOK §7.4 fallback polling). */
export function useAiJob(jobId: string | null) {
  return useQuery({
    queryKey: ['ai', 'jobs', jobId],
    queryFn: () => apiFetch<AiJobSummary>(`/api/v1/ai/jobs/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (query) => (ACTIVE.has(query.state.data?.status ?? '') ? 2000 : false),
  });
}

export function useCancelAiJob(jobId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<AiJobSummary>(`/api/v1/ai/jobs/${jobId}/cancel`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['ai', 'jobs', jobId], data);
    },
  });
}

interface PartialFailure {
  node: string;
  errors: string[];
}

/**
 * Rút danh sách phần thất bại từ `error.detail` của AIJob (job SUCCEEDED kèm `PARTIAL_FAILURES`).
 * Port nguyên văn `apps/web/src/features/ai/ai-job-partial.ts`: kiểm từng lớp, hình dạng lạ thì
 * coi như không có phần thất bại, không làm hỏng màn hình.
 */
export function partialFailuresOf(error: { code: string; detail: unknown } | null | undefined) {
  if (error?.code !== 'PARTIAL_FAILURES') return [];
  const detail = error.detail;
  if (typeof detail !== 'object' || detail === null) return [];
  const list = (detail as { partialFailures?: unknown }).partialFailures;
  if (!Array.isArray(list)) return [];

  return list.flatMap((item): PartialFailure[] => {
    if (typeof item !== 'object' || item === null) return [];
    const { node, errors } = item as { node?: unknown; errors?: unknown };
    if (typeof node !== 'string') return [];
    return [
      {
        node,
        errors: Array.isArray(errors) ? errors.filter((e): e is string => typeof e === 'string') : [],
      },
    ];
  });
}
