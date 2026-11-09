import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { ApiClientError } from './api-client';

/**
 * React Query cho React Native: "cửa sổ được focus" = app quay lại foreground (AppState), để dữ
 * liệu tự làm mới khi người dùng mở lại app. staleTime 30s như web (HANDBOOK §12.2).
 */
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
    return () => sub.remove();
  });
}
// Trạng thái online do `startNetworkSync` (src/lib/offline/network.ts) điều khiển từ expo-network,
// không ép luôn true: offline thì query tạm dừng thay vì lỗi, và nút nộp bài bị khoá.

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Lỗi 4xx là trả lời thật của server (không có quyền, không tồn tại) — thử lại vô ích.
      retry: (count, err) =>
        !(err instanceof ApiClientError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});
