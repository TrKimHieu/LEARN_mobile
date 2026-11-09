/** FNV-1a 32-bit — chỉ để rút gọn origin thành tên file, không dùng cho bảo mật. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Một file SQLite cho mỗi environment + origin + tài khoản, cùng cách phân vùng với token
 * (`token-store.ts`): đổi tài khoản hay đổi server không bao giờ đọc cache của bên kia.
 */
export function dbNameFor(s: { environment: string; origin: string; userId: string }): string {
  const user = s.userId.replace(/[^A-Za-z0-9_-]/g, '_');
  return `learn-${s.environment}-${fnv1a(s.origin)}-${user}.db`;
}
