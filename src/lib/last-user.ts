import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { UserPublic } from '@/contracts';
import { config } from './config';

/**
 * Hồ sơ người dùng gần nhất, để mở app khi mất mạng vẫn vào được cache offline của đúng tài khoản
 * (R2). Không phải bí mật, nhưng cất cùng chỗ và cùng phân vùng environment + origin với refresh
 * token, và xoá cùng lúc khi đăng xuất. Bản web không lưu.
 */
const originKey = Array.from(config.apiUrl).map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const KEY = `learn.lastUser.${config.environment}.${originKey}`;

export async function readLastUser(): Promise<UserPublic | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<UserPublic>;
    return typeof u.id === 'string' && u.id ? (u as UserPublic) : null;
  } catch {
    return null;
  }
}

export async function writeLastUser(user: UserPublic | null): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (user) await SecureStore.setItemAsync(KEY, JSON.stringify(user));
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Kho khoá lỗi: chỉ mất khả năng mở offline lần sau, không chặn đăng nhập.
  }
}
