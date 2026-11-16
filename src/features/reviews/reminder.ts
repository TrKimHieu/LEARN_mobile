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

/** Gọi mỗi khi biết số thẻ đến hạn từ server: có thẻ thì hẹn nhắc, không có thì huỷ. */
export async function syncReviewReminder(dueCount: number, now = new Date()): Promise<void> {
  const on = (await AsyncStorage.getItem(KEY).catch(() => null)) === '1';
  if (!on || dueCount <= 0) return cancelScheduled(NOTIFY_ID);
  return scheduleAt(NOTIFY_ID, nextReminderAt(now), 'Đến giờ ôn tập', `Bạn có ${dueCount} thẻ đến hạn.`);
}
