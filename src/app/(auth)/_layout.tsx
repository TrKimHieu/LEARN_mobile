import { Stack } from 'expo-router';
import { usePalette } from '@/theme/theme';

/** Màn khai báo đầu tiên là màn khởi đầu khi Stack.Protected đẩy khách về nhóm này. */
export default function AuthLayout() {
  const p = usePalette();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.app } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
