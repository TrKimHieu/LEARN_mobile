import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { Mascot } from '@/components/mascot';
import { Button, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

/**
 * Đường dẫn không tồn tại (deep link cũ, bài học đã xoá, hoặc route cần đăng nhập khi đang là
 * khách) — như `apps/web/src/app/not-found.tsx`. Không phải ngõ cụt: luôn có đường về.
 */
export default function NotFoundScreen() {
  const p = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl, backgroundColor: p.app }}>
      <Stack.Screen options={{ title: 'Không tìm thấy' }} />
      <Mascot state="confused" size={88} />
      <Txt variant="title" style={{ textAlign: 'center' }}>
        Không tìm thấy trang này
      </Txt>
      <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
        Đường dẫn có thể đã cũ, hoặc nội dung đã bị xoá.
      </Txt>
      <Button label="Về Tổng quan" icon="home" onPress={() => router.replace('/')} />
    </View>
  );
}
