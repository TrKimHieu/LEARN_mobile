import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CourseSummary,
  CreateDeckInput,
  CreateFlashcardInput,
  DeckDetailResponse,
  DeckListResponse,
  DeckSummary,
  DueFlashcardsResponse,
  Flashcard,
  FlashcardReviewResult,
  PatchDeckInput,
  PatchFlashcardInput,
  SubmitFlashcardReviewInput,
} from '@/contracts';
import { apiFetch } from '@/lib/api-client';
import { queueOrSend } from '@/lib/offline/outbox';

/**
 * Bộ thẻ tự tạo (W1, ADR 005): tách khỏi ôn câu hỏi bài tập (`features/reviews`).
 * Cùng endpoint và khóa cache với web. Một khóa gốc `['decks']` phủ danh sách và chi tiết.
 */
const DECKS = ['decks'] as const;

export function useDecks() {
  return useQuery({ queryKey: DECKS, queryFn: () => apiFetch<DeckListResponse>('/api/v1/decks') });
}

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: [...DECKS, deckId],
    queryFn: () => apiFetch<DeckDetailResponse>(`/api/v1/decks/${encodeURIComponent(deckId)}/cards`),
    enabled: Boolean(deckId),
  });
}

function useInvalidateDecks() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: DECKS });
}

export function useCreateDeck() {
  const done = useInvalidateDecks();
  return useMutation({
    mutationFn: (input: CreateDeckInput) => apiFetch<DeckSummary>('/api/v1/decks', { method: 'POST', body: input }),
    onSuccess: done,
  });
}

export function usePatchDeck(deckId: string) {
  const done = useInvalidateDecks();
  return useMutation({
    mutationFn: (input: PatchDeckInput) =>
      apiFetch<DeckSummary>(`/api/v1/decks/${encodeURIComponent(deckId)}`, { method: 'PATCH', body: input }),
    onSuccess: done,
  });
}

export function useDeleteDeck(deckId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/decks/${encodeURIComponent(deckId)}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.removeQueries({ queryKey: [...DECKS, deckId] });
      return client.invalidateQueries({ queryKey: DECKS });
    },
  });
}

export function useCreateCard(deckId: string) {
  const done = useInvalidateDecks();
  return useMutation({
    mutationFn: (input: CreateFlashcardInput) =>
      apiFetch<Flashcard>(`/api/v1/decks/${encodeURIComponent(deckId)}/cards`, { method: 'POST', body: input }),
    onSuccess: done,
  });
}

export function usePatchCard() {
  const done = useInvalidateDecks();
  return useMutation({
    mutationFn: ({ cardId, ...input }: PatchFlashcardInput & { cardId: string }) =>
      apiFetch<Flashcard>(`/api/v1/cards/${encodeURIComponent(cardId)}`, { method: 'PATCH', body: input }),
    onSuccess: done,
  });
}

export function useDeleteCard() {
  const done = useInvalidateDecks();
  return useMutation({
    mutationFn: (cardId: string) => apiFetch(`/api/v1/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE' }),
    onSuccess: done,
  });
}

/** Khóa học để gắn bộ thẻ; khóa cache riêng vì feature này không import feature courses. */
export function useCourseOptions() {
  return useQuery({
    queryKey: ['course-options'],
    queryFn: () => apiFetch<{ courses: CourseSummary[] }>('/api/v1/workspace'),
  });
}

/**
 * Thẻ đến hạn cho phiên ôn: một bộ, hoặc mọi bộ khi `deckId = null` ("Ôn hôm nay" của thẻ).
 * Phiên chụp danh sách lúc mở; được persist nên mở lại khi mất mạng vẫn ôn được.
 */
export function useDueCards(deckId: string | null) {
  return useQuery({
    queryKey: [...DECKS, deckId ?? 'all', 'due'],
    queryFn: () =>
      apiFetch<DueFlashcardsResponse>(
        deckId ? `/api/v1/decks/${encodeURIComponent(deckId)}/due?limit=50` : '/api/v1/flashcards/due?limit=50',
      ),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/** Số thẻ đến hạn của mọi bộ, cho huy hiệu tab và Tổng quan. */
export function useDueCardCount() {
  return useQuery({
    queryKey: [...DECKS, 'due-count'],
    queryFn: () => apiFetch<DueFlashcardsResponse>('/api/v1/flashcards/due?limit=1'),
    select: (d) => d.dueCount,
    refetchInterval: 60_000,
  });
}

/**
 * Gửi Mức nhớ. Key và giờ chấm do phiên giữ nguyên, nên gửi lại sau lỗi mạng hay từ outbox vẫn chỉ
 * ghi một lần. `undefined` = đã xếp hàng chờ mạng.
 */
export function useSubmitCardReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, key, ...body }: SubmitFlashcardReviewInput & { cardId: string; key: string }) => {
      const path = `/api/v1/cards/${encodeURIComponent(cardId)}/review`;
      return queueOrSend<FlashcardReviewResult>({ method: 'POST', path, body, eventId: key }, () =>
        apiFetch<FlashcardReviewResult>(path, { method: 'POST', body, headers: { 'Idempotency-Key': key } }),
      );
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [...DECKS, 'due-count'] });
      return client.invalidateQueries({ queryKey: DECKS, refetchType: 'none' });
    },
  });
}
