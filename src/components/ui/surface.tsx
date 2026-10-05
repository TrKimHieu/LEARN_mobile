import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { Icon, type IconName } from './icon';
import { Txt } from './text';

/** Thẻ — nền panel, viền mảnh, không bóng (ADR 012 của LEARN: bề mặt yên tĩnh). */
export function Card({
  children,
  style,
  padded = true,
  emphasis = 'none',
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** `strong`: viền đậm — trạng thái đúng/được chọn; `dashed`: viền đứt — sai/chưa công bố. */
  emphasis?: 'none' | 'strong' | 'dashed';
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  const base: ViewStyle = {
    backgroundColor: p.panel,
    borderRadius: radius.card,
    borderWidth: emphasis === 'strong' ? 1.5 : StyleSheet.hairlineWidth * 2,
    borderColor: emphasis === 'strong' ? p.fgMuted : p.line,
    borderStyle: emphasis === 'dashed' ? 'dashed' : 'solid',
    padding: padded ? space.lg : 0,
    overflow: 'hidden',
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { backgroundColor: p.panel2 }, style]}
    >
      {children}
    </Pressable>
  );
}

type BadgeTone = 'neutral' | 'strong' | 'outline';

/** Nhãn trạng thái — luôn chữ (+ icon khi cần), không bao giờ chỉ bằng màu (UI-GUIDE §2). */
export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
}) {
  const p = usePalette();
  const bg = tone === 'strong' ? p.fgMuted : tone === 'outline' ? 'transparent' : p.muted;
  const fg = tone === 'strong' ? p.panel : p.fgMuted;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: tone === 'outline' ? p.lineStrong : bg,
        },
      ]}
    >
      {icon && <Icon name={icon} size={12} color={fg} weight="bold" />}
      <Txt variant="caption" style={{ color: fg }}>
        {label}
      </Txt>
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  height = 6,
  label,
  track,
  fill,
}: {
  value: number;
  max: number;
  height?: number;
  label?: string;
  track?: string;
  fill?: string;
}) {
  const p = usePalette();
  const pct = max > 0 ? Math.round(Math.min(1, Math.max(0, value / max)) * 100) : 0;
  return (
    <View
      // Không nhãn = thanh phụ hoạ cho con số đã có chữ bên cạnh → ẩn, đừng khai progressbar không tên.
      {...(label
        ? { role: 'progressbar' as const, 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }
        : { 'aria-hidden': true })}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: track ?? p.track,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: fill ?? p.fgMuted }} />
    </View>
  );
}

/** Khối chờ tải — nhấp nháy nhẹ, đứng yên nếu người dùng bật giảm chuyển động. */
export function Skeleton({ height, width, style }: { height: number; width?: number | `${number}%`; style?: ViewStyle }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.View
      style={[
        { height, width: width ?? '100%', borderRadius: radius.control, backgroundColor: p.muted },
        { opacity },
        style,
      ]}
    />
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  const p = usePalette();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: p.line }, style]} />;
}

/** Tiêu đề khối + hành động bên phải. */
export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="heading" accessibilityRole="header">
          {title}
        </Txt>
        {description && (
          <Txt variant="small" tone="subtle">
            {description}
          </Txt>
        )}
      </View>
      {action}
    </View>
  );
}

/** Chọn một trong vài giá trị — dùng cho giao diện sáng/tối và độ khó bài tập. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: p.muted, opacity: disabled ? 0.5 : 1 }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            style={[
              styles.segment,
              selected && {
                backgroundColor: p.panel,
                borderColor: p.lineStrong,
                borderWidth: StyleSheet.hairlineWidth * 2,
              },
            ]}
          >
            <Txt variant={selected ? 'smallStrong' : 'small'} tone={selected ? 'fg' : 'subtle'}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.md,
  },
  segmented: { flexDirection: 'row', borderRadius: radius.control, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control - 2,
    paddingHorizontal: space.sm,
  },
});
