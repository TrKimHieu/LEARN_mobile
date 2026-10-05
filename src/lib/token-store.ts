import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Refresh token — ADR 016 của LEARN: app native nhận refresh token trong body và cất vào kho khoá
 * của hệ điều hành (Keychain / Keystore qua `expo-secure-store`). Access token không bao giờ được
 * lưu, chỉ sống trong bộ nhớ (`api-client.ts`).
 *
 * Bản web của app (`expo start --web`) chỉ để xem nhanh lúc dev: không có kho khoá, nên giữ
 * trong bộ nhớ — tải lại trang là đăng nhập lại, không đẩy token vào localStorage.
 */
const KEY = 'learn.refreshToken';
let webMemory: string | null = null;

export async function readRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return webMemory;
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    // Kho khoá hỏng / bị xoá (vd. khôi phục máy): coi như chưa đăng nhập.
    return null;
  }
}

export async function writeRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    webMemory = token;
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}
