import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, Txt } from '@/components/ui';
import { LogoMark, Mascot } from '@/components/mascot';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { queryClient } from '@/lib/query-client';
import { FONT_SOURCES } from '@/theme/fonts';
import { ThemeProvider, usePalette } from '@/theme/theme';
import { dark, font, light, space } from '@/theme/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  // Lỗi nạp font thì vẫn chạy bằng font hệ thống, không kẹt ở màn trắng.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Lỗi render không bắt được ở màn nào — như `apps/web/src/app/error.tsx`. Chạy THAY cho layout gốc
 * nên không có ThemeProvider/QueryClient: tự chọn bảng màu theo hệ thống, chỉ dùng component RN
 * thuần. Không hiện stack trace cho người dùng.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme();
  const p = scheme === 'dark' ? dark : light;
  return (
    <View style={[styles.center, { backgroundColor: p.app, padding: space.xl }]}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: p.fg, textAlign: 'center' }}>Đã có lỗi xảy ra</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: p.fgSubtle, textAlign: 'center' }}>
        Ứng dụng gặp lỗi không lường trước. Thử lại, nếu vẫn lỗi hãy đóng hẳn ứng dụng rồi mở lại.
      </Text>
      <Pressable
        onPress={() => void retry()}
        accessibilityRole="button"
        style={{ backgroundColor: p.primary, borderRadius: 8, paddingHorizontal: space.xl, paddingVertical: space.md }}
      >
        <Text style={{ color: p.primaryFg, fontSize: 16, fontWeight: '600' }}>Thử lại</Text>
      </Pressable>
    </View>
  );
}

/**
 * Root Stack — bài giảng Navigation §4.3.4 / §4.7 (DocsTest):
 * - `(auth)` và phần còn lại bảo vệ bằng `Stack.Protected`: chưa đăng nhập thì các route trong app
 *   không tồn tại, deep link vào đó tự rơi về đăng nhập; đăng nhập xong tự chuyển vào app.
 * - `(tabs)`: 4 đích cấp cao ngang hàng (như thanh điều hướng web).
 * - Chi tiết khóa học / đọc bài / bài tập nằm ở Root Stack, ngoài Tabs → che tab bar khi đi sâu.
 * - Tạo khóa học, sửa bài học: `modal` — tác vụ tạm thời cần tập trung.
 */
function RootNavigator() {
  const { status, retry, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const p = usePalette();

  if (status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: p.app }]}>
        <StatusBar style={p.scheme === 'dark' ? 'light' : 'dark'} />
        <LogoMark size={56} />
        <ActivityIndicator color={p.fgSubtle} />
      </View>
    );
  }

  if (status === 'offline') {
    return (
      <View style={[styles.center, { backgroundColor: p.app, padding: space.xl }]}>
        <StatusBar style={p.scheme === 'dark' ? 'light' : 'dark'} />
        <Mascot state="alerting" size={88} />
        <Txt variant="heading" style={{ textAlign: 'center' }}>
          Không kết nối được máy chủ
        </Txt>
        <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
          Phiên đăng nhập vẫn được giữ trên máy. Kiểm tra kết nối Internet rồi thử lại.
        </Txt>
        <Button label="Thử lại" icon="retry" onPress={retry} />
      </View>
    );
  }

  const authed = status === 'authed';

  return (
    <>
      <StatusBar style={p.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.app },
          headerTintColor: p.fg,
          headerTitleStyle: { fontFamily: font.semibold, fontSize: 17, color: p.fg },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: p.app },
        }}
      >
        <Stack.Protected guard={authed}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="course/new" options={{ presentation: 'modal', title: 'Tạo khóa học' }} />
          <Stack.Screen name="course/[courseId]/index" options={{ title: 'Khóa học' }} />
          <Stack.Screen name="course/[courseId]/lesson/[lessonId]/index" options={{ title: 'Bài học' }} />
          <Stack.Screen name="course/[courseId]/lesson/[lessonId]/practice" options={{ title: 'Bài tập' }} />
          <Stack.Screen
            name="course/[courseId]/lesson/[lessonId]/edit"
            options={{ presentation: 'modal', title: 'Sửa bài học' }}
          />
        </Stack.Protected>
        {/* Quản trị rút gọn: lớp UX — server chặn thật bằng RolesGuard. */}
        <Stack.Protected guard={authed && isAdmin}>
          <Stack.Screen name="admin/ai-jobs/index" options={{ title: 'AI Job' }} />
          <Stack.Screen name="admin/ai-jobs/[jobId]" options={{ title: 'AI Job' }} />
        </Stack.Protected>
        <Stack.Protected guard={!authed}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
});
