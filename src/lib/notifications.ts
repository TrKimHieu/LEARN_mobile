import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Thông báo cục bộ (D1). Không có push từ server. Từ chối quyền thì mọi tính năng vẫn chạy,
 * chỉ thiếu thông báo. Bản web xem thử không lên lịch gì.
 */
const supported = Platform.OS !== 'web';

let handlerSet = false;
function ensureHandler() {
  if (handlerSet || !supported) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Hỏi quyền khi người dùng tự bật tính năng; đã từ chối thì không hỏi lại. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    ensureHandler();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Lên lịch một thông báo theo id cố định; gọi lại cùng id thì thay lịch cũ. */
export async function scheduleAt(id: string, date: Date, title: string, body: string): Promise<void> {
  if (!supported) return;
  await cancelScheduled(id);
  if (date.getTime() <= Date.now()) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    // Không có quyền hoặc hệ điều hành từ chối: bỏ qua, app vẫn chạy.
  }
}

export async function cancelScheduled(id: string): Promise<void> {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
