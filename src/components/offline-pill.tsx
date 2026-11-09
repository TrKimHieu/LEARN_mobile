import { StyleSheet, View } from 'react-native';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { useIsOnline } from '@/lib/offline/network';
import { Icon } from './ui/icon';
import { Txt } from './ui/text';

/** Viên nhỏ báo đang offline; chỉ hiện khi mất mạng. */
export function OfflinePill() {
  const p = usePalette();
  const online = useIsOnline();
  if (online) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.pill, { backgroundColor: p.muted, borderColor: p.lineStrong }]}
    >
      <Icon name="alert" size={14} color={p.fgMuted} />
      <Txt variant="caption" tone="muted">
        Offline
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
