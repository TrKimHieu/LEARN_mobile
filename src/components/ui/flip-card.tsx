import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Button } from './button';
import { Txt } from './text';

/** Mọi thẻ cùng một khung: chữ dài bị cắt bằng dấu "…" thay vì làm thẻ cao thấp khác nhau. */
export const FLIP_CARD_HEIGHT = 240;
const PROMPT_LINES = 6;
const ANSWER_LINES = 7;
const FLIP_MS = 420;

type FlipCardProps = {
  cardId?: string;
  prompt: string;
  answer: string;
  /** Gọi sau mỗi lần lật (`true` = đang hiện đáp án), kể cả khi kích hoạt bằng trình đọc màn hình. */
  onFlip?: (revealed: boolean) => void;
};

/**
 * Thẻ lật 3D: hai mặt cùng xoay quanh trục dọc, chữ xoay theo mặt thẻ. Mặt sau chỉ được mount từ lần
 * lật đầu tiên, nên đáp án không có trong cây (kể cả với trình đọc màn hình) trước khi người dùng lật.
 * Mặt đang úp bị ẩn khỏi trình đọc màn hình. "Giảm chuyển động" thì đổi mặt ngay, không xoay.
 */
export function FlipCard(props: FlipCardProps) {
  // Remount on card or content change so even a one-frame render cannot expose the next answer.
  return <FlipCardFace key={JSON.stringify([props.cardId, props.prompt, props.answer])} {...props} />;
}

function FlipCardFace({ prompt, answer, onFlip }: FlipCardProps) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [backMounted, setBackMounted] = useState(false);
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(turn, {
      toValue: revealed ? 1 : 0,
      duration: reduced ? 0 : FLIP_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [revealed, reduced, turn]);

  const flip = () => {
    const next = !revealed;
    setBackMounted(true);
    setRevealed(next);
    onFlip?.(next);
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(next ? `Đáp án: ${answer}` : `Câu hỏi: ${prompt}`);
    }
  };

  const face = { backgroundColor: p.panel, borderColor: p.line };
  const frontRotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <View style={{ gap: space.md }}>
      {/* Chạm vào thẻ cũng lật; nút bên dưới là lối chính cho trình đọc màn hình. */}
      <Pressable onPress={flip} accessible={false} style={{ height: FLIP_CARD_HEIGHT }}>
        <Animated.View
          style={[styles.face, face, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}
          {...hiddenWhen(revealed)}
        >
          <Txt variant="caption" tone="subtle">Câu hỏi</Txt>
          <Txt variant="bodyStrong" numberOfLines={PROMPT_LINES} aria-live={Platform.OS === 'web' ? 'polite' : undefined}>
            {prompt}
          </Txt>
        </Animated.View>
        {backMounted && (
          <Animated.View
            style={[styles.face, face, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}
            {...hiddenWhen(!revealed)}
          >
            <Txt variant="caption" tone="subtle">Đáp án</Txt>
            <Txt numberOfLines={ANSWER_LINES} aria-live={Platform.OS === 'web' ? 'polite' : undefined}>
              {answer}
            </Txt>
          </Animated.View>
        )}
      </Pressable>
      <Button label={revealed ? 'Xem câu hỏi' : 'Lật thẻ xem đáp án'} variant="secondary" onPress={flip} />
    </View>
  );
}

/** Mặt đang úp: không đọc, không chạm được (cả iOS, Android và bản web). */
function hiddenWhen(hidden: boolean) {
  return {
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? ('no-hide-descendants' as const) : ('auto' as const),
    'aria-hidden': hidden,
    pointerEvents: hidden ? ('none' as const) : ('auto' as const),
  };
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backfaceVisibility: 'hidden',
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
    gap: space.md,
    justifyContent: 'center',
  },
});
