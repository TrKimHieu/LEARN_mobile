import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DueReviewsResponse, ReviewGrade, ReviewResult, SubmitReviewInput } from '@/contracts';
import { randomUUID } from 'expo-crypto';
import { apiFetch } from '@/lib/api-client';
import { queueOrSend } from '@/lib/offline/outbox';

const DUE_KEY = ['reviews', 'due'] as const;

/** Key được persist offline (R2), nên danh sách thẻ vẫn mở được khi mất mạng. */
export function useDueReviews() {
  return useQuery({
    queryKey: DUE_KEY,
    queryFn: () => apiFetch<DueReviewsResponse>('/api/v1/reviews/due'),
  });
}

export type GradeInput = { questionId: string; grade: ReviewGrade };

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    /**
     * Mỗi lượt chấm một key, giữ nguyên khi xếp hàng offline: outbox gửi lại đúng key nên server
     * chỉ ghi một lần. `reviewedAt` lấy lúc chấm, không phải lúc gửi. `undefined` = đã xếp hàng.
     */
    mutationFn: ({ questionId, grade }: GradeInput): Promise<ReviewResult | undefined> => {
      const path = `/api/v1/reviews/${encodeURIComponent(questionId)}`;
      const body: SubmitReviewInput = { grade, reviewedAt: new Date().toISOString() };
      const key = randomUUID();
      return queueOrSend({ method: 'POST', path, body, eventId: key }, () =>
        apiFetch<ReviewResult>(path, { method: 'POST', body, headers: { 'Idempotency-Key': key } }),
      );
    },
    onSuccess: (result, { questionId }) => {
      // Gửi được hay đã xếp hàng đều bỏ thẻ khỏi cache để phiên ôn đi tiếp khi offline.
      queryClient.setQueryData<DueReviewsResponse>(DUE_KEY, (old) => {
        if (!old || !old.cards.some((c) => c.questionId === questionId)) return old;
        return {
          ...old,
          cards: old.cards.filter((c) => c.questionId !== questionId),
          dueCount: Math.max(0, old.dueCount - 1),
        };
      });
      if (result) void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
