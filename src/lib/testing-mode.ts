import type { NativeAuthResponse } from '@/contracts';

type Result = { status: number; payload: any };
type MockApi = { request: (path: string, options?: object) => Result };
let api: MockApi | null = null;
let token = '';
const listeners = new Set<() => void>();

export const isTesting = () => api !== null;
export const subscribeTesting = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function startTesting(): NativeAuthResponse {
  // Lazy loading keeps mock initialization outside normal application startup.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMockApi } = require('./testing/core') as { createMockApi: (options: object) => MockApi };
  const next = createMockApi({ accessTtlMs: Number.MAX_SAFE_INTEGER });
  const result = next.request('/api/v1/auth/login', {
    method: 'POST', body: { email: 'demo@learn.ai', password: 'Demo@12345' },
  });
  if (result.status !== 200) throw new Error('Không mở được chế độ Testing.');
  const session = result.payload as NativeAuthResponse;
  token = session.accessToken;
  api = next;
  listeners.forEach((listener) => listener());
  return session;
}

export function stopTesting(): void {
  api = null;
  token = '';
  listeners.forEach((listener) => listener());
}

export function requestTesting(path: string, options: object): Result {
  if (!api) throw new Error('Chế độ Testing chưa được bật.');
  return api.request(path, { ...options, headers: { authorization: `Bearer ${token}` } });
}
