import type { KvStore } from './db/stores';

/**
 * "Việc hôm nay" lưu theo tài khoản (kv trong DB SQLite của tài khoản), khác web dùng localStorage:
 * đổi tài khoản trên cùng máy không lẫn danh sách. Chế độ Testing không có DB thì dùng bộ nhớ.
 */
export const TODAY_KEY = 'learn.today';
export const MOOD_KEY = 'learn.mood';

/** Ngày theo giờ máy, dạng YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

const memory = new Map<string, string>();

export async function readToday(kv: KvStore | null, key: string): Promise<string | null> {
  if (!kv) return memory.get(key) ?? null;
  return kv.get(key).catch(() => null);
}

export async function writeToday(kv: KvStore | null, key: string, value: string): Promise<void> {
  if (!kv) return void memory.set(key, value);
  await kv.set(key, value).catch(() => undefined);
}

let onChange: (() => void) | null = null;
/** Màn Học đăng ký để đọc lại danh sách khi một màn khác đánh dấu xong. */
export function setTodayListener(fn: (() => void) | null) {
  onChange = fn;
}

/** Đánh dấu một việc đã xong trong danh sách hôm nay; không làm gì nếu danh sách là của ngày khác. */
export async function markTodayDone(kv: KvStore | null, taskId: string, now = new Date()): Promise<void> {
  try {
    const raw = await readToday(kv, TODAY_KEY);
    if (!raw) return;
    const plan = JSON.parse(raw) as { day?: unknown; done?: unknown };
    if (plan?.day !== todayKey(now) || !Array.isArray(plan.done) || plan.done.includes(taskId)) return;
    await writeToday(kv, TODAY_KEY, JSON.stringify({ ...plan, done: [...plan.done, taskId] }));
    onChange?.();
  } catch {
    // Dữ liệu hỏng: đánh dấu xong chỉ là tiện ích, không chặn việc học.
  }
}
