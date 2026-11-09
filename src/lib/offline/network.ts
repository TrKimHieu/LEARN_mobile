import { onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

type NetState = { isConnected?: boolean; isInternetReachable?: boolean };

/** Online khi biết chắc có internet; chưa biết thì tin vào kết nối; không có thông tin thì coi là online. */
export function isOnlineState(s: NetState): boolean {
  return s.isInternetReachable ?? s.isConnected ?? true;
}

/**
 * Nối trạng thái mạng của thiết bị vào `onlineManager` của React Query. Gọi một lần khi app khởi động;
 * trả về hàm huỷ. Trên web trình duyệt đã tự lo `online`/`offline` nên không làm gì.
 */
export function startNetworkSync(): () => void {
  if (Platform.OS === 'web') return () => {};
  onlineManager.setEventListener((setOnline) => {
    let active = true;
    const sub = addNetworkStateListener((e) => {
      active = false; // sự kiện thật mới hơn giá trị đầu
      setOnline(isOnlineState(e));
    });
    void getNetworkStateAsync()
      .then((s) => {
        if (active) setOnline(isOnlineState(s));
      })
      .catch(() => {});
    return () => sub.remove();
  });
  return () => onlineManager.setEventListener(() => () => {});
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
}
