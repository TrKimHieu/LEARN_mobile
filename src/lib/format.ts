/**
 * Định dạng hiển thị — cùng nguyên tắc với `apps/web/src/lib/format.ts`: mốc gần thì nói
 * "3 giờ trước", xa hơn một tuần thì hiện ngày.
 *
 * Tự viết thay vì `Intl.RelativeTimeFormat`: Hermes (engine JS của React Native) không có đủ
 * `Intl`, và app phải hiện đúng như nhau trên mọi máy.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** "vừa xong" · "3 phút trước" · "hôm qua" · "12/9/2026". Chuỗi rỗng nếu ngày không hợp lệ. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return '';
  const diff = now.getTime() - ms;

  if (diff < MINUTE) return 'vừa xong';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return dateLabel(iso);
}

/** Mốc đầy đủ tới phút — cho chỗ cần chính xác. */
export function absoluteTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Lưới an toàn cho luật "không đổ enum thô của API ra màn hình" (UI-GUIDE §10 của LEARN):
 * mã backend thêm sau vẫn đọc được thay vì lọt "PAST_DUE" ra giao diện.
 */
export function humanizeCode(code: string): string {
  const words = code.toLowerCase().replace(/_/g, ' ').trim();
  if (words.length === 0) return code;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
