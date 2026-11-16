import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';
import { useDueReviews } from '../reviews-api';

// T2-5: "đến hạn" do server tính theo múi giờ server. Đổi giờ máy không được đổi số thẻ đến hạn.
const mockApiFetch = jest.fn();
jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, apiFetch: (...a: unknown[]) => mockApiFetch(...a) };
});

let seen: ReturnType<typeof useDueReviews>['data'];
function Probe() {
  const { data } = useDueReviews();
  useEffect(() => { seen = data; });
  return null;
}

afterEach(() => jest.useRealTimers());

it('asks the server without any device time and shows the server count, even with the clock moved a year ahead', async () => {
  jest.useFakeTimers({ now: new Date('2027-11-16T00:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  mockApiFetch.mockResolvedValue({ cards: [], dueCount: 3, nextDueAt: null });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let tree: ReturnType<typeof create> | undefined;
  await act(async () => {
    tree = create(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>);
  });
  await act(async () => { await jest.runOnlyPendingTimersAsync(); });
  expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/reviews/due');
  expect(seen?.dueCount).toBe(3);
  act(() => tree!.unmount());
  qc.clear();
});
