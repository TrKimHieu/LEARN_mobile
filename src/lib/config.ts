import Constants from 'expo-constants';

/**
 * Địa chỉ API của LEARN (`apps/api`, cổng 4000).
 *
 * Ưu tiên `EXPO_PUBLIC_API_URL` (file `.env` của app). Không đặt thì suy từ máy đang chạy Metro:
 * Expo Go tải bundle từ `192.168.x.y:8081`, nên API cùng máy đó ở `192.168.x.y:4000` — điện thoại
 * không tới được `localhost` của máy tính.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // "192.168.1.20:8081"
  const host = hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

export const config = {
  apiUrl: resolveApiUrl(),
} as const;
