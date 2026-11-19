import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { cancelScheduled, ensureNotificationPermission, scheduleAt } from '@/lib/notifications';

const KEY = 'learn.reminder.review';
const NOTIFY_ID = 'learn.review.due';
export const REMINDER_HOUR = 19;

/** Lần nhắc kế tiếp: hôm nay lúc `hour` giờ nếu còn kịp, không thì ngày mai (giờ máy, chỉ để báo). */
export function nextReminderAt(now: Date, hour = REMINDER_HOUR): Date {
  const at = new Date(now);
  at.setHours(hour, 0, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

/** Công tắc nhắc ôn, mặc định tắt. Bật thì xin quyền; từ chối thì giữ tắt. */
export function useReviewReminder() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setEnabled(v === '1')).catch(() => undefined);
  }, []);
  const set = useCallback(async (on: boolean) => {
    const ok = on ? await ensureNotificationPermission() : true;
    const next = on && ok;
    setEnabled(next);
    await AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => undefined);
    if (!next) await cancelScheduled(NOTIFY_ID);
    return next;
  }, []);
  return { enabled, set };
}

/**
 * Nội dung nhắc học (T4-4). `remaining` là các việc hôm nay chưa xong (rỗng = đạt mục tiêu, không nhắc).
 * Qua 19:00 thì lần nhắc kế tiếp là ngày mai, khi chưa biết việc của ngày mai: dùng câu chung.
 */
export function studyReminderText(
  remaining: string[],
  now: Date,
  at: Date,
  /** T4-5: số ngày của chuỗi đang có nhưng hôm nay chưa có ngày học (chưa nộp bài, chưa ôn thẻ); 0 = không nguy cơ. */
  streakAtRisk = 0,
): { title: string; body: string } | null {
  if (at.getDate() !== now.getDate()) {
    return remaining.length > 0 || streakAtRisk > 0 ? { title: 'Đến giờ học', body: 'Mở LEARN để xem việc hôm nay.' } : null;
  }
  // Không trách móc (phản mục tiêu của spec): chỉ nói chuỗi còn giữ được.
  if (streakAtRisk > 0) {
    return {
      title: `Giữ chuỗi ${streakAtRisk} ngày`,
      body: remaining.length > 0 ? remaining.join(' · ') : 'Ôn vài thẻ hoặc làm một bài luyện tập để giữ chuỗi.',
    };
  }
  if (remaining.length === 0) return null;
  return { title: `Còn ${remaining.length} việc hôm nay`, body: remaining.join(' · ') };
}

/** Gọi khi màn Học biết danh sách việc hôm nay: còn việc (hoặc chuỗi sắp đứt) thì hẹn nhắc 19:00, không thì huỷ. */
export async function syncStudyReminder(remaining: string[], now = new Date(), streakAtRisk = 0): Promise<void> {
  const on = (await AsyncStorage.getItem(KEY).catch(() => null)) === '1';
  const at = nextReminderAt(now);
  const text = on ? studyReminderText(remaining, now, at, streakAtRisk) : null;
  if (!text) return cancelScheduled(NOTIFY_ID);
  return scheduleAt(NOTIFY_ID, at, text.title, text.body);
}
