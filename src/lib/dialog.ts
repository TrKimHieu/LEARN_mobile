import { Alert, Platform } from 'react-native';

/**
 * Hộp xác nhận cho hành động có hậu quả (xoá, huỷ gói, đăng xuất mọi nơi). Native: `Alert` của hệ
 * điều hành; bản web xem thử: `window.confirm` (react-native-web không hiện `Alert` nhiều nút).
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Huỷ',
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(message ? `${title}\n\n${message}` : title) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
