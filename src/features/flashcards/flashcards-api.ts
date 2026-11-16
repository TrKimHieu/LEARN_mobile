import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcceptFlashcardDraftsInput,
  AcceptFlashcardDraftsResult,
  AiJobDetail,
  DocumentList,
  FlashcardDraftList,
  GenerateFlashcardsInput,
  LessonSummary,
  PatchFlashcardDraftInput,
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

// ── W2: AI sinh thẻ và duyệt Thẻ nháp (cùng endpoint với web) ──
export function useCourseLessons(courseId: string) {
  return useQuery({
    queryKey: ['flashcard-source', 'lessons', courseId],
    queryFn: () => apiFetch<{ lessons: LessonSummary[] }>(`/api/v1/courses/${courseId}/lessons`),
    enabled: Boolean(courseId),
  });
}

export function useCourseDocuments(courseId: string) {
  return useQuery({
    queryKey: ['flashcard-source', 'documents', courseId],
    queryFn: () => apiFetch<{ documents: DocumentList[] }>(`/api/v1/courses/${courseId}/documents`),
    enabled: Boolean(courseId),
  });
}

export function useGenerateFlashcards(courseId: string) {
  return useMutation({
    mutationFn: (input: GenerateFlashcardsInput) =>
      apiFetch<AiJobDetail>(`/api/v1/ai/courses/${courseId}/generate-flashcards`, {
        method: 'POST',
        body: input,
      }),
  });
}

const ACTIVE = new Set(['QUEUED', 'RUNNING']);

/** Theo dõi job sinh thẻ: hỏi lại mỗi 1,5 giây khi còn chạy, dừng khi đã xong. */
export function useFlashcardJob(jobId: string | null) {
  return useQuery({
    queryKey: ['ai', 'flashcard-job', jobId],
    queryFn: () => apiFetch<AiJobDetail>(`/api/v1/ai/jobs/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (query) => (ACTIVE.has(query.state.data?.status ?? '') ? 1500 : false),
  });
}

export function useCancelFlashcardJob(jobId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<AiJobDetail>(`/api/v1/ai/jobs/${jobId}/cancel`, { method: 'POST' }),
    onSuccess: (data) => client.setQueryData(['ai', 'flashcard-job', jobId], data),
  });
}

export function useDrafts(aiJobId?: string) {
  return useQuery({
    queryKey: [...DECKS, 'drafts', aiJobId ?? 'all'],
    queryFn: () =>
      apiFetch<FlashcardDraftList>(
        aiJobId ? `/api/v1/flashcards/drafts?aiJobId=${aiJobId}` : '/api/v1/flashcards/drafts',
      ),
  });
}

export function usePatchDraft() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: PatchFlashcardDraftInput & { id: string }) =>
      apiFetch(`/api/v1/flashcards/drafts/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: [...DECKS, 'drafts'] }),
  });
}

export function useDeleteDraft() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/flashcards/drafts/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: [...DECKS, 'drafts'] }),
  });
}

export function useAcceptDrafts() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptFlashcardDraftsInput) =>
      apiFetch<AcceptFlashcardDraftsResult>('/api/v1/flashcards/drafts/accept', {
        method: 'POST',
        body: input,
      }),
    // Thẻ mới đến hạn ngay: số đếm của bộ và điều hướng đổi theo.
    onSuccess: () => client.invalidateQueries({ queryKey: DECKS }),
  });
}
