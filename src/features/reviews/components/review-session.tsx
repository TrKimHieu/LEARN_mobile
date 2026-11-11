import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReviewCard, ReviewGrade } from '@/contracts';
import { Button, EmptyState, FlipCard, InlineError, ProgressBar, Screen, Txt } from '@/components/ui';
import { errorText } from '@/lib/api-client';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { ActionBar } from '@/features/exercises/components/action-bar';
import { useSubmitReview } from '../reviews-api';

const GRADES: { label: string; grade: ReviewGrade; variant: 'primary' | 'secondary' }[] = [
  { label: 'Quên', grade: 'AGAIN', variant: 'secondary' },
  { label: 'Khó', grade: 'HARD', variant: 'secondary' },
  { label: 'Được', grade: 'GOOD', variant: 'primary' },
  { label: 'Dễ', grade: 'EASY', variant: 'secondary' },
];

/**
 * Phiên ôn: chụp danh sách thẻ lúc mở (cache `['reviews','due']` co lại sau mỗi lượt chấm, phiên
 * không được nhảy theo). Mỗi thẻ: lật → chấm 4 mức → thẻ kế.
 */
export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const submit = useSubmitReview();
  const [deck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (deck.length === 0) {
    return (
      <Screen width="reading">
        <EmptyState
          title="Chưa có thẻ cần ôn"
          description="Làm bài tập trong khóa học, các câu đã làm sẽ quay lại đúng lúc cần ôn."
          action={{ label: 'Tới Khóa học', onPress: () => router.push('/(tabs)/courses') }}
        />
      </Screen>
    );
  }

  if (index >= deck.length) {
    return (
      <Screen width="reading">
        <EmptyState
          title="Xong lượt ôn hôm nay"
          description={`Bạn đã ôn ${deck.length} thẻ. Thẻ tiếp theo sẽ tới đúng lúc.`}
          action={{ label: 'Về Tổng quan', onPress: () => router.navigate('/(tabs)') }}
        />
      </Screen>
    );
  }

  const card = deck[index]!;

  async function grade(g: ReviewGrade) {
    setError(null);
    try {
      await submit.mutateAsync({ questionId: card.questionId, grade: g });
      setFlipped(false);
      setIndex((i) => i + 1);
    } catch (err) {
      setError(errorText(err, 'Không lưu được lượt chấm, vui lòng thử lại.'));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Screen width="reading" bottomSpace={130 + insets.bottom}>
        <Txt variant="small" tone="subtle">
          {card.courseTitle} · {card.lessonTitle}
        </Txt>
        {/* Đã xem đáp án một lần thì mở khoá nút chấm (cả khi lật bằng TalkBack/VoiceOver). */}
        <View testID="review-card">
          <FlipCard
            cardId={card.questionId}
            prompt={card.prompt}
            answer={answerOf(card)}
            onFlip={(revealed) => revealed && setFlipped(true)}
          />
        </View>
        {error && <InlineError>{error}</InlineError>}
      </Screen>

      <ActionBar>
        <View style={styles.bar}>
          <View style={{ gap: 6 }}>
            <Txt variant="caption" tone="subtle">
              {`${index + 1}/${deck.length}`}
            </Txt>
            <ProgressBar value={index} max={deck.length} label={`Đã ôn ${index} trên ${deck.length} thẻ`} />
          </View>
          {flipped && (
            <View style={styles.grades}>
              {GRADES.map((g) => (
                <Button
                  key={g.grade}
                  label={g.label}
                  variant={g.variant}
                  disabled={submit.isPending}
                  onPress={() => void grade(g.grade)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          )}
        </View>
      </ActionBar>
    </View>
  );
}

function answerOf(card: ReviewCard): string {
  return card.explanation ? `${card.answerText}\n\n${card.explanation}` : card.answerText;
}

const styles = StyleSheet.create({
  bar: { flex: 1, gap: space.sm },
  grades: { flexDirection: 'row', gap: space.sm },
});
