import { useMutation } from '@tanstack/react-query';
import type { ForgotPasswordInput, ResetPasswordInput } from '@/contracts';
import { apiFetch } from '@/lib/api-client';

/**
 * Lời gọi auth không gắn với phiên. Đăng nhập, đăng ký, đăng xuất đổi trạng thái phiên nên nằm ở
 * `auth-context.tsx`.
 */

/** FR-AUTH-07 bước 1 — máy chủ trả cùng một câu cho mọi email. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiFetch('/api/v1/auth/forgot-password', { method: 'POST', body: input }),
  });
}

/** FR-AUTH-07 bước 2 — đổi xong, mọi phiên cũ bị đăng xuất. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiFetch('/api/v1/auth/reset-password', { method: 'POST', body: input }),
  });
}
