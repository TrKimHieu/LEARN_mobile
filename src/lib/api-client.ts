import { CLIENT_HEADER, NATIVE_CLIENT, type NativeAuthResponse } from '@/contracts';
import { config } from './config';
import { readRefreshToken, writeRefreshToken } from './token-store';

/** Access token chỉ sống trong bộ nhớ — HANDBOOK §10.1. */
let accessToken: string | null = null;

/** Gọi khi phiên hết hẳn (refresh thất bại) để AuthProvider đưa về màn đăng nhập. */
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: string | undefined,
    message: string,
    requestId?: string,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.meta = meta;
  }
}

/** True nếu lỗi là 402 QUOTA_EXCEEDED, kèm type-narrow `meta` sang {metric, limit, used}. */
export function isQuotaExceededError(
  err: unknown,
): err is ApiClientError & { meta: { metric: string; limit: number; used: number } } {
  return err instanceof ApiClientError && err.code === 'QUOTA_EXCEEDED';
}

/** Câu chữ hiển thị cho một lỗi bất kỳ — cùng quy ước với web. */
export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** `requestId` để người dùng đọc lại khi báo lỗi (HANDBOOK §12.3). */
export function errorDetail(err: unknown): string | undefined {
  return err instanceof ApiClientError ? err.requestId : undefined;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 404;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  retried?: boolean;
}

/** Envelope lỗi chuẩn HANDBOOK §7.3: {type, title, status, code, detail, requestId, meta}. */
interface ErrorEnvelope {
  detail?: string;
  code?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}

async function readError(res: Response): Promise<ErrorEnvelope> {
  try {
    return (await res.json()) as ErrorEnvelope;
  } catch {
    return {};
  }
}

const NETWORK_MESSAGE =
  'Không kết nối được máy chủ. Kiểm tra điện thoại và máy chạy API có cùng mạng Wi‑Fi không.';

/** Gọi API kèm Bearer token + tự refresh một lần khi nhận 401. */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, retried = false } = options;
  const headers: Record<string, string> = { [CLIENT_HEADER]: NATIVE_CLIENT };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK', NETWORK_MESSAGE);
  }

  if (res.status === 401 && !retried && !path.startsWith('/api/v1/auth/')) {
    const ok = await refreshSession();
    if (ok) return apiFetch<T>(path, { ...options, retried: true });
    onSessionExpired?.();
  }

  if (!res.ok) {
    const envelope = await readError(res);
    throw new ApiClientError(
      res.status,
      envelope.code,
      envelope.detail ?? `Yêu cầu thất bại (${res.status}).`,
      envelope.requestId,
      envelope.meta,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

let refreshing: Promise<NativeAuthResponse | null> | null = null;

/**
 * Đổi refresh token (trong SecureStore) lấy phiên mới, có xoay vòng. Nhiều request cùng dính 401
 * chỉ gây MỘT lượt refresh — gửi token cũ hai lần sẽ bị server coi là tái sử dụng và thu hồi cả
 * family (HANDBOOK §10.1).
 */
export function refreshSession(): Promise<NativeAuthResponse | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refreshToken = await readRefreshToken();
      if (!refreshToken) return null;
      const data = await apiFetch<NativeAuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        retried: true,
      });
      await storeSession(data);
      return data;
    } catch (err) {
      // Mất mạng thì giữ token để thử lại sau; bị từ chối thật (401) mới xoá.
      if (err instanceof ApiClientError && err.status === 401) await clearSession();
      else setAccessToken(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function storeSession(data: NativeAuthResponse): Promise<void> {
  setAccessToken(data.accessToken);
  await writeRefreshToken(data.refreshToken);
}

export async function clearSession(): Promise<void> {
  setAccessToken(null);
  await writeRefreshToken(null);
}

export { readRefreshToken };
