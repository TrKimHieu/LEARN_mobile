/**
 * Luồng phiên đăng nhập của app (ADR 016): 401 → đổi refresh token trong SecureStore lấy phiên mới
 * → gửi lại request. Đây là chỗ dễ sai nhất: gửi cùng một refresh token hai lần bị server coi là
 * tái sử dụng và thu hồi CẢ family, người dùng bị đá ra.
 */
jest.mock('../config', () => ({ config: { apiUrl: 'http://api.test' } }));

let mockStored: string | null = null;
jest.mock('../token-store', () => ({
  readRefreshToken: jest.fn(async () => mockStored),
  writeRefreshToken: jest.fn(async (t: string | null) => {
    mockStored = t;
  }),
}));

import { apiFetch, refreshSession, setAccessToken, setSessionExpiredHandler } from '../api-client';

type Handler = (url: string, init: RequestInit) => Promise<Response> | Response;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockFetch(handler: Handler) {
  const fn = jest.fn((url: string, init: RequestInit = {}) => Promise.resolve(handler(url, init)));
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

const session = (n: number) => ({
  user: { id: 'u1', email: 'a@b.c' },
  accessToken: `access-${n}`,
  refreshToken: `refresh-token-number-${n}-xxxxxxxx`,
});

beforeEach(() => {
  mockStored = 'refresh-token-number-0-xxxxxxxx';
  setAccessToken('access-expired');
  setSessionExpiredHandler(null);
});

describe('apiFetch + refreshSession', () => {
  it('mọi request gửi header client native', async () => {
    const fetchFn = mockFetch(() => json(200, { ok: true }));
    await apiFetch('/api/v1/meta');
    const headers = fetchFn.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['x-learn-client']).toBe('native');
    expect(headers['Authorization']).toBe('Bearer access-expired');
  });

  it('nhiều request cùng dính 401 chỉ gây MỘT lượt refresh, rồi đều thành công', async () => {
    let refreshCalls = 0;
    const fetchFn = mockFetch((url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++;
        expect(JSON.parse(String(init.body))).toEqual({ refreshToken: 'refresh-token-number-0-xxxxxxxx' });
        return json(201, session(1));
      }
      const auth = (init.headers as Record<string, string>)['Authorization'];
      return auth === 'Bearer access-1' ? json(200, { url }) : json(401, { code: 'UNAUTHENTICATED' });
    });

    const results = await Promise.all([apiFetch('/api/v1/a'), apiFetch('/api/v1/b'), apiFetch('/api/v1/c')]);
    expect(results).toHaveLength(3);
    expect(refreshCalls).toBe(1);
    expect(mockStored).toBe(session(1).refreshToken); // token xoay vòng được cất lại
    expect(fetchFn.mock.calls.length).toBe(7); // 3 lỗi + 1 refresh + 3 gửi lại
  });

  it('refresh bị từ chối (401) → xoá token và báo hết phiên', async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    mockFetch((url) =>
      url.endsWith('/auth/refresh') ? json(401, { code: 'UNAUTHENTICATED' }) : json(401, { code: 'UNAUTHENTICATED' }),
    );
    await expect(apiFetch('/api/v1/progress/overview')).rejects.toMatchObject({ status: 401 });
    expect(mockStored).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('mất mạng lúc refresh → GIỮ token để thử lại sau, không đá người dùng ra', async () => {
    mockFetch(() => {
      throw new TypeError('Network request failed');
    });
    await expect(refreshSession()).resolves.toBeNull();
    expect(mockStored).toBe('refresh-token-number-0-xxxxxxxx');
  });

  it('lỗi có envelope → ApiClientError mang detail/code/requestId', async () => {
    mockFetch(() => json(402, { detail: 'Hết hạn mức', code: 'QUOTA_EXCEEDED', requestId: 'req-1', meta: { used: 3 } }));
    await expect(apiFetch('/api/v1/courses', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 402,
      code: 'QUOTA_EXCEEDED',
      message: 'Hết hạn mức',
      requestId: 'req-1',
    });
  });
});
