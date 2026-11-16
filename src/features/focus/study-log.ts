import type { KvStore } from '@/lib/db/stores';
import { todayKey } from './timer';

/**
 * Thời gian học cục bộ (T3-5, T3-6). Lưu trong DB SQLite của tài khoản nên đổi tài khoản không lẫn,
 * đăng xuất hẳn thì mất cùng DB. Không gửi lên server (quyết định 2026-11-16).
 */
export type DayLog = { total: number; byCourse: Record<string, number>; byLesson: Record<string, number> };
export type StudyLog = Record<string, DayLog>;

export const STUDY_LOG_KEY = 'focus.study-log';
const KEEP_DAYS = 90;

export function addMinutes(
  log: StudyLog,
  date: string,
  minutes: number,
  ctx: { courseId?: string; lessonId?: string } = {},
): StudyLog {
  const day = log[date] ?? { total: 0, byCourse: {}, byLesson: {} };
  const next: DayLog = {
    total: day.total + minutes,
    byCourse: ctx.courseId ? { ...day.byCourse, [ctx.courseId]: (day.byCourse[ctx.courseId] ?? 0) + minutes } : day.byCourse,
    byLesson: ctx.lessonId ? { ...day.byLesson, [ctx.lessonId]: (day.byLesson[ctx.lessonId] ?? 0) + minutes } : day.byLesson,
  };
  // Chỉ giữ 90 ngày gần nhất để kv không phình mãi.
  const keep = Object.keys({ ...log, [date]: next }).sort().slice(-KEEP_DAYS);
  return Object.fromEntries(keep.map((k) => [k, k === date ? next : log[k]!]));
}

/** Số phút 7 ngày gần nhất (cũ trước), ngày không học = 0. */
export function lastDays(log: StudyLog, today: Date, n = 7): { date: string; minutes: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (n - 1 - i));
    const key = todayKey(d);
    return { date: key, minutes: log[key]?.total ?? 0 };
  });
}

export function parseLog(raw: string | null): StudyLog {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as StudyLog) : {};
  } catch {
    return {};
  }
}

export async function recordFocus(
  kv: KvStore,
  minutes: number,
  ctx: { courseId?: string; lessonId?: string },
  now = new Date(),
): Promise<void> {
  const log = parseLog(await kv.get(STUDY_LOG_KEY));
  await kv.set(STUDY_LOG_KEY, JSON.stringify(addMinutes(log, todayKey(now), minutes, ctx)));
}
