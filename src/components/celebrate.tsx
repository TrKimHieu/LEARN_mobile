import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/**
 * Pháo giấy khi qua bài — bản mobile của `apps/web/src/lib/celebrate.ts`. Cùng phạm vi hẹp:
 * CHỈ khi đạt điểm qua bài (HANDBOOK §13.2), không phải gamification. Thang xám như web nhưng bỏ hai
 * đầu gần-đen/gần-trắng (ADR 001 của app). Không chặn chạm; tắt hẳn khi bật giảm chuyển động.
 */
const COLORS = ['#3d3d3d', '#5c5c5c', '#8a8a8a', '#b5b5b5', '#d6d6d6'];
const COUNT = 32;

export function Confetti({ fire }: { fire: number }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  // Mỗi lượt bắn một bộ mảnh mới (`fire` đổi = một lượt nộp đạt mới).
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 6,
        delay: Math.random() * 0.25,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        color: COLORS[i % COLORS.length]!,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fire, width],
  );

  useEffect(() => {
    if (reduced || fire === 0) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fire, reduced, progress]);

  if (reduced || fire === 0) return null;

  return (
    <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
      {pieces.map((pc, i) => {
        const start = pc.delay;
        const t = progress.interpolate({
          inputRange: [0, start, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: -20,
              left: pc.x,
              width: pc.size,
              height: pc.size * 0.6,
              backgroundColor: pc.color,
              borderRadius: 1,
              opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.75] }) },
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, pc.drift] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${pc.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
