import { dehydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AuthProvider, useAuth, type AuthContextValue } from '@/features/auth/auth-context';
import { OfflineProvider } from '../offline-provider';
import { stopTesting } from '@/lib/testing-mode';
import { openAccountDb } from '@/lib/db/sqlite';
import { storeSession } from '@/lib/api-client';
import { persistBuster } from '@/lib/offline/persister';

const mockUser = { id: 'real-user', displayName: 'Real', email: 'real@example.com', role: 'LEARNER' };
const mockStorage = new Map<string, string>();
let mockDeferredRead: Promise<string | null> | null = null;
jest.mock('@/lib/config', () => ({ config: { environment: 'development', apiUrl: 'https://api.test' } }));
jest.mock('@/lib/server-meta', () => ({ APP_VERSION: '1.0.0' }));
jest.mock('@/lib/last-user', () => ({ readLastUser: jest.fn(), writeLastUser: jest.fn() }));
jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn().mockResolvedValue(undefined),
  readRefreshToken: jest.fn(async () => 'real-refresh-token'),
  refreshSession: jest.fn(async () => ({ user: mockUser })),
  setSessionExpiredHandler: jest.fn(), storeSession: jest.fn(), clearSession: jest.fn(),
}));
jest.mock('@/lib/db/sqlite', () => ({
  openAccountDb: jest.fn(async () => ({
    kv: {
      get: async (key: string) => mockDeferredRead ?? mockStorage.get(key) ?? null,
      set: async (key: string, value: string) => { mockStorage.set(key, value); },
      remove: async (key: string) => { mockStorage.delete(key); },
    },
    outbox: { count: async () => 0, list: async () => [] },
    close: async () => {},
  })),
  deleteAccountDb: jest.fn(),
}));

beforeEach(() => {
  mockStorage.clear();
  mockDeferredRead = null;
  jest.clearAllMocks();
});

it('preserves the real persisted cache and never persists demo queries', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let auth!: AuthContextValue;
  let tree!: ReactTestRenderer;
  function Probe() { auth = useAuth(); return null; }
  try {
    await act(async () => {
      tree = create(<QueryClientProvider client={client}><AuthProvider><OfflineProvider><Probe /></OfflineProvider></AuthProvider></QueryClientProvider>);
    });
    expect(auth.user?.id).toBe('real-user');
    await act(async () => { client.setQueryData(['courses'], { courses: [{ id: 'real-course' }] }); });
    const realCache = mockStorage.get('rq-cache');
    expect(realCache).toContain('real-course');
    await act(async () => { await auth.enterTesting(); });
    await act(async () => { client.setQueryData(['courses'], { courses: [{ id: 'demo-course' }] }); });
    expect(mockStorage.get('rq-cache')).toBe(realCache);
    expect(openAccountDb).toHaveBeenCalledTimes(1);
    expect(storeSession).not.toHaveBeenCalled();
    expect(auth.testing).toBe(true);
  } finally {
    if (tree) act(() => tree.unmount());
    client.clear();
    stopTesting();
  }
});

it('ignores real cache restoration that finishes after Testing starts', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const source = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  source.setQueryData(['courses'], { courses: [{ id: 'late-real-course' }] });
  const saved = JSON.stringify({ timestamp: Date.now(), buster: persistBuster(), clientState: dehydrate(source) });
  let release!: (value: string) => void;
  mockDeferredRead = new Promise<string>((resolve) => { release = resolve; });
  let auth!: AuthContextValue;
  let tree!: ReactTestRenderer;
  function Probe() { auth = useAuth(); return null; }
  try {
    await act(async () => {
      tree = create(<QueryClientProvider client={client}><AuthProvider><OfflineProvider><Probe /></OfflineProvider></AuthProvider></QueryClientProvider>);
    });
    await act(async () => { await auth.enterTesting(); });
    await act(async () => {
      release(saved);
      await mockDeferredRead;
    });
    // The real cache must never enter the shared client, even before demo data loads.
    expect(client.getQueryData(['courses'])).toBeUndefined();
  } finally {
    if (tree) act(() => tree.unmount());
    client.clear();
    source.clear();
    stopTesting();
  }
});
