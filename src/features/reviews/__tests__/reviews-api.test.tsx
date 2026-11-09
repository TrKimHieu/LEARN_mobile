import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { DueReviewsResponse } from '@/contracts';
import { ApiClientError } from '@/lib/api-client';
import { setOutboxSink } from '@/lib/offline/outbox';
import { useSubmitReview } from '../reviews-api';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, apiFetch: (...a: unknown[]) => mockApiFetch(...a) };
});
jest.mock('expo-crypto', () => ({ randomUUID: () => 'key-1' }));

const card = (id: string) => ({
  questionId: id, prompt: `P ${id}`, type: 'SHORT', answerText: `A ${id}`, explanation: null,
  courseId: 'c', courseTitle: 'C', lessonId: 'l', lessonTitle: 'L', dueAt: '2026-11-09T00:00:00.000Z',
  intervalDays: 1, repetitions: 1,
});
const due: DueReviewsResponse = { cards: [card('q1'), card('q2')], dueCount: 2, nextDueAt: null };

let api: ReturnType<typeof useSubmitReview>;
let tree: ReactTestRenderer;
let qc: QueryClient;
function Probe() {
  const v = useSubmitReview();
  useEffect(() => { api = v; });
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(['reviews', 'due'], due);
  act(() => { tree = create(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>); });
});
afterEach(() => { act(() => tree.unmount()); setOutboxSink(null); });

const cached = () => qc.getQueryData<DueReviewsResponse>(['reviews', 'due'])!;

it('sends grade, reviewedAt and Idempotency-Key, drops the card from cache and invalidates', async () => {
  mockApiFetch.mockResolvedValue({ questionId: 'q1', applied: true });
  const spy = jest.spyOn(qc, 'invalidateQueries');
  await act(async () => { await api.mutateAsync({ questionId: 'q1', grade: 'GOOD' }); });
  const [path, init] = mockApiFetch.mock.calls[0];
  expect(path).toBe('/api/v1/reviews/q1');
  expect(init.method).toBe('POST');
  expect(init.headers).toEqual({ 'Idempotency-Key': 'key-1' });
  expect(init.body.grade).toBe('GOOD');
  expect(new Date(init.body.reviewedAt).toISOString()).toBe(init.body.reviewedAt);
  expect(cached().cards.map((c) => c.questionId)).toEqual(['q2']);
  expect(cached().dueCount).toBe(1);
  expect(spy).toHaveBeenCalledWith({ queryKey: ['reviews'] });
});

it('queues on network error with the same key, still drops the card, no invalidate', async () => {
  mockApiFetch.mockRejectedValue(new ApiClientError(0, undefined, 'offline'));
  const sink = jest.fn().mockResolvedValue(undefined);
  setOutboxSink(sink);
  const spy = jest.spyOn(qc, 'invalidateQueries');
  let res: unknown = 'x';
  await act(async () => { res = await api.mutateAsync({ questionId: 'q1', grade: 'AGAIN' }); });
  expect(res).toBeUndefined();
  expect(sink).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/v1/reviews/q1', eventId: 'key-1' }));
  expect(cached().cards.map((c) => c.questionId)).toEqual(['q2']);
  expect(cached().dueCount).toBe(1);
  expect(spy).not.toHaveBeenCalled();
});

it('keeps the card when the server rejects', async () => {
  mockApiFetch.mockRejectedValue(new ApiClientError(500, undefined, 'boom'));
  await act(async () => { await api.mutateAsync({ questionId: 'q1', grade: 'HARD' }).catch(() => undefined); });
  expect(cached().cards).toHaveLength(2);
});
