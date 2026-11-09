import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { LoginInput, NativeAuthResponse, RegisterInput, UserPublic } from '@/contracts';
import {
  apiFetch,
  clearSession,
  readRefreshToken,
  refreshSession,
  setSessionExpiredHandler,
  storeSession,
} from '@/lib/api-client';
import { readLastUser, writeLastUser } from '@/lib/last-user';

/**
 * `offline`: có phiên đã lưu nhưng không tới được máy chủ lúc mở app — khác `guest` (chưa đăng
 * nhập). Không được đẩy người dùng về màn đăng nhập chỉ vì mất mạng.
 */
export type AuthStatus = 'loading' | 'authed' | 'guest' | 'offline';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserPublic | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserPublic | null>(null);
  const [attempt, setAttempt] = useState(0);

  const toGuest = useCallback(() => {
    setUser(null);
    setStatus('guest');
    queryClient.clear();
    void writeLastUser(null);
  }, [queryClient]);

  /** Mở app → đổi refresh token trong SecureStore lấy phiên mới. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      if (!(await readRefreshToken())) {
        if (!cancelled) setStatus('guest');
        return;
      }
      const session = await refreshSession();
      if (cancelled) return;
      if (session) {
        setUser(session.user as UserPublic);
        setStatus('authed');
        void writeLastUser(session.user as UserPublic);
        return;
      }
      // refreshSession chỉ xoá token khi bị từ chối thật; token còn nghĩa là lỗi mạng.
      if (!(await readRefreshToken())) {
        setStatus('guest');
        return;
      }
      // Mất mạng nhưng phiên còn: vào bằng tài khoản gần nhất để đọc cache offline (R2).
      // Request đầu tiên khi có mạng lại nhận 401 và api-client tự làm mới phiên.
      const last = await readLastUser();
      if (cancelled) return;
      if (last) {
        setUser(last);
        setStatus('authed');
      } else setStatus('offline');
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    setSessionExpiredHandler(toGuest);
    return () => setSessionExpiredHandler(null);
  }, [toGuest]);

  const start = useCallback(async (data: NativeAuthResponse) => {
    await storeSession(data);
    setUser(data.user as UserPublic);
    setStatus('authed');
    await writeLastUser(data.user as UserPublic);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      await start(
        await apiFetch<NativeAuthResponse>('/api/v1/auth/login', { method: 'POST', body: input }),
      );
    },
    [start],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await start(
        await apiFetch<NativeAuthResponse>('/api/v1/auth/register', { method: 'POST', body: input }),
      );
    },
    [start],
  );

  const endSession = useCallback(
    async (path: '/api/v1/auth/logout' | '/api/v1/auth/logout-all') => {
      try {
        const refreshToken = await readRefreshToken();
        await apiFetch(path, { method: 'POST', body: refreshToken ? { refreshToken } : undefined });
      } catch {
        // Phiên hết hạn / mất mạng — vẫn đăng xuất trên máy.
      } finally {
        await clearSession();
        toGuest();
      }
    },
    [toGuest],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      register,
      logout: () => endSession('/api/v1/auth/logout'),
      logoutAll: () => endSession('/api/v1/auth/logout-all'),
      retry: () => setAttempt((n) => n + 1),
    }),
    [status, user, login, register, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>.');
  return ctx;
}
