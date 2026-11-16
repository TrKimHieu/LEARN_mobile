import { onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { isTesting, subscribeTesting } from '../testing-mode';

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
  onlineManager.setEventListener((setOnline) => {
    let active = true;
    let deviceOnline = onlineManager.isOnline();
    const update = (online: boolean) => {
      deviceOnline = online;
      setOnline(isTesting() || deviceOnline);
    };
    const offTesting = subscribeTesting(() => setOnline(isTesting() || deviceOnline));
    if (Platform.OS === 'web') {
      const onOnline = () => update(true);
      const onOffline = () => update(false);
      globalThis.addEventListener('online', onOnline);
      globalThis.addEventListener('offline', onOffline);
      update(globalThis.navigator.onLine);
      return () => {
        offTesting();
        globalThis.removeEventListener('online', onOnline);
        globalThis.removeEventListener('offline', onOffline);
      };
    }
    const sub = addNetworkStateListener((e) => {
      active = false; // sự kiện thật mới hơn giá trị đầu
      update(isOnlineState(e));
    });
    void getNetworkStateAsync()
      .then((s) => {
        if (active) update(isOnlineState(s));
      })
      .catch(() => {});
    return () => { offTesting(); sub.remove(); };
  });
  return () => onlineManager.setEventListener(() => () => {});
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
}
