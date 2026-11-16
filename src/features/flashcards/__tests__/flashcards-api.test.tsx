import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ApiClientError } from '@/lib/api-client';
import { setOutboxSink } from '@/lib/offline/outbox';
import { useSubmitCardReview } from '../flashcards-api';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, apiFetch: (...a: unknown[]) => mockApiFetch(...a) };
});

let api: ReturnType<typeof useSubmitCardReview>;
let tree: ReactTestRenderer;
let qc: QueryClient;
function Probe() {
  const v = useSubmitCardReview();
  useEffect(() => { api = v; });
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  act(() => { tree = create(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>); });
});
afterEach(() => { act(() => tree.unmount()); qc.clear(); setOutboxSink(null); });

const input = { cardId: 'c 1', grade: 'GOOD' as const, reviewedAt: '2026-11-16T10:00:00.000Z', key: 'k-1' };

it('posts the grade with the session key and time', async () => {
  mockApiFetch.mockResolvedValue({ cardId: 'c 1' });
  await act(async () => { await api.mutateAsync(input); });
  expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/cards/c%201/review', {
    method: 'POST',
    body: { grade: 'GOOD', reviewedAt: '2026-11-16T10:00:00.000Z' },
    headers: { 'Idempotency-Key': 'k-1' },
  });
});

it('queues offline with the same key as eventId', async () => {
  const sink = jest.fn(async () => undefined);
  setOutboxSink(sink);
  mockApiFetch.mockRejectedValue(new ApiClientError(0, undefined, 'offline'));
  let res: unknown = 'x';
  await act(async () => { res = await api.mutateAsync(input); });
  expect(res).toBeUndefined();
  expect(sink).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'k-1', path: '/api/v1/cards/c%201/review' }));
});
