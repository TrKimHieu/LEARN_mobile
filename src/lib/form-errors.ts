import type { ZodError } from 'zod';

/**
 * Zod trả một mảng issue; form cần biết Ô NÀO sai để đánh dấu đúng ô đó — port của
 * `apps/web/src/lib/form-errors.ts`. Mỗi ô chỉ hiện luật đầu để không dội chữ.
 */
export function fieldErrorsFrom<T extends string>(
  error: ZodError,
  fields: readonly T[],
  translate: (field: T, message: string) => string = (_f, m) => m,
): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string' || !(fields as readonly string[]).includes(key)) continue;
    const field = key as T;
    if (out[field] === undefined) out[field] = translate(field, issue.message);
  }
  return out;
}

/** Schema auth trong contracts để message mặc định của Zod (tiếng Anh) — dịch cho màn hình. */
export function authMessage(field: string, message: string): string {
  if (field === 'email') return 'Email không hợp lệ.';
  if (field === 'password' && /8/.test(message)) return 'Mật khẩu cần ít nhất 8 ký tự.';
  if (field === 'password') return 'Vui lòng nhập mật khẩu.';
  if (field === 'displayName') return 'Tên hiển thị cần từ 2 đến 100 ký tự.';
  return message;
}
