import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** Thanh hành động ghim đáy màn bài tập. Màn đặt `bottomSpace` đủ để nội dung không bị che. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: p.panel, borderColor: p.line, paddingBottom: insets.bottom + space.sm }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
