import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Icon, type IconName } from './icon';
import { Txt } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const HEIGHT: Record<Size, number> = { sm: 40, md: 48, lg: 52 };
/** Độ dày gờ đáy của nút nổi, như `0 4px 0 var(--edge)` của web. */
const EDGE = 4;

/**
 * Nút — cùng bốn biến thể với web. `danger` theo ADR 015: viền đậm trên nền panel, khác hẳn khối
 * đặc của nút chính, và luôn đi kèm bước xác nhận ở chỗ gọi. Chiều cao tối thiểu 40 (vùng chạm
 * ≥ 44 nhờ `hitSlop`).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const inactive = disabled || loading;
  const reduced = useReducedMotion();

  const bg =
    variant === 'primary' ? p.primary : variant === 'secondary' ? p.panel : 'transparent';
  const bgPressed =
    variant === 'primary' ? p.primaryPressed : variant === 'ghost' ? p.muted : p.panel2;
  const fg = variant === 'primary' ? p.primaryFg : p.fg;
  const border =
    variant === 'secondary' ? p.lineStrong : variant === 'danger' ? p.fg : 'transparent';
  // Nút "nổi" như web (`.tactile`): gờ màu đậm ở đáy; nhấn thì mặt nút lún xuống phủ gờ. Ghost thì phẳng.
  const edge = variant === 'primary' ? p.primaryEdge : variant === 'ghost' ? null : border;
  const sink = edge && !reduced && !inactive;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      hitSlop={size === 'sm' ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={inactive}
      aria-busy={loading}
      style={[
        {
          borderRadius: radius.control,
          marginTop: edge ? EDGE : 0,
          backgroundColor: edge ?? 'transparent',
          opacity: disabled && !loading ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {({ pressed }) => (
      <View
        style={[
          styles.base,
          {
            minHeight: HEIGHT[size],
            paddingVertical: space.sm,
            paddingHorizontal: size === 'sm' ? space.md : space.lg,
            // Mặt nút có gờ phía sau phải đặc, nếu không gờ lộ qua nền trong suốt của `danger`.
            backgroundColor: pressed ? bgPressed : variant === 'danger' ? p.panel : bg,
            borderColor: border,
            borderWidth: variant === 'danger' ? 1.5 : StyleSheet.hairlineWidth * 2,
            transform: [{ translateY: edge ? (pressed && sink ? 0 : -EDGE) : 0 }],
          },
        ]}
      >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} color={fg} />
        )}
        <Txt
          variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'}
          style={{ color: fg, flexShrink: 1, textAlign: 'center' }}
        >
          {label}
        </Txt>
        {iconRight && !loading && (
          <Icon name={iconRight} size={size === 'sm' ? 16 : 18} color={fg} />
        )}
      </View>
      </View>
      )}
    </Pressable>
  );
}

/** Nút chỉ có icon — luôn có `accessibilityLabel`. */
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  size = 40,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          width: size,
          height: size,
          backgroundColor: pressed ? p.muted : 'transparent',
          opacity: disabled ? 0.3 : 1,
        },
      ]}
    >
      <Icon name={icon} size={18} color={p.fgMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, flexShrink: 1, maxWidth: '100%' },
  iconBtn: { borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
});
