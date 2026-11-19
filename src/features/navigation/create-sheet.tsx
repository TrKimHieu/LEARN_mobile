import { router, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const ITEMS: { label: string; href: Href; icon: 'layers' | 'list' | 'sparkles' }[] = [
  { label: 'Khóa học từ tài liệu', href: routes.newCourse, icon: 'layers' },
  // Bộ thẻ mới tạo ở đầu tab Thẻ (ô tên bộ thẻ nằm ngay trên cùng).
  { label: 'Bộ thẻ mới', href: '/(tabs)/decks' as Href, icon: 'list' },
  { label: 'Sinh thẻ bằng AI', href: routes.generateCards, icon: 'sparkles' },
];

/** Nút "＋ Tạo" (spec web 4.1): ba lối tạo, cách một lần chạm từ mọi tab. */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const go = (href: Href) => {
    onClose();
    router.push(href);
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <Pressable style={[styles.backdrop, { backgroundColor: p.overlay }]} onPress={onClose} accessibilityLabel="Đóng" />
      <View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: p.panel, borderColor: p.line, paddingBottom: insets.bottom + space.lg }]}
      >
        <Txt variant="heading">Tạo</Txt>
        {ITEMS.map((it) => (
          <Button key={it.label} label={it.label} icon={it.icon} variant="secondary" fullWidth onPress={() => go(it.href)} />
        ))}
        <Button label="Huỷ" variant="ghost" fullWidth onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    gap: space.md,
    padding: space.lg,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
