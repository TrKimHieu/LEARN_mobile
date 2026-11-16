import { randomUUID } from 'expo-crypto';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DueFlashcardsResponse } from '@/contracts';
import { Button, EmptyState, FlipCard, InlineError, ProgressBar, Screen, Txt } from '@/components/ui';
import { ActionBar } from '@/features/exercises/components/action-bar';
import { errorText } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { useSubmitCardReview } from '../flashcards-api';
import {
  choose, confirmPending, currentCard, GRADES, isFinished, progressLabel, reveal, startSession, type Grade,
} from '../review-session';

/**
 * Phiên ôn thẻ tự tạo (W1). Chụp danh sách lúc mở. Lượt chấm chờ xác nhận giữ nguyên key và giờ chấm,
 * nên bấm lại sau lỗi mạng chỉ ghi một lần; mất mạng hẳn thì vào outbox và đi tiếp.
 */
export function CardReviewSession({ data }: { data: DueFlashcardsResponse }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const submit = useSubmitCardReview();
  const [s, setS] = useState(() => startSession(data.cards));
  const [error, setError] = useState<string | null>(null);

  if (s.cards.length === 0) {
    return (
      <Screen width="reading">
        <EmptyState
          title="Chưa có thẻ đến hạn"
          description={data.nextDueAt ? `Thẻ kế tiếp đến hạn ${relativeTime(data.nextDueAt)}.` : 'Thêm thẻ vào bộ để bắt đầu ôn.'}
          action={{ label: 'Về Thẻ', onPress: () => router.navigate('/(tabs)/decks' as Href) }}
        />
      </Screen>
    );
  }
  if (isFinished(s)) {
    return (
      <Screen width="reading">
        <EmptyState
          title="Xong lượt ôn"
          description={`Bạn đã ôn ${s.reviewed} thẻ.`}
          action={{ label: 'Về Thẻ', onPress: () => router.navigate('/(tabs)/decks' as Href) }}
        />
      </Screen>
    );
  }

  const card = currentCard(s)!;

  async function grade(g: Grade) {
    const next = choose(s, g, new Date(), randomUUID);
    const pending = next.pending ?? s.pending;
    if (!pending) return;
    setS(next);
    setError(null);
    try {
      await submit.mutateAsync({
        cardId: pending.cardId, grade: pending.grade, reviewedAt: pending.reviewedAt, key: pending.key,
      });
      setS((cur) => confirmPending(cur));
    } catch (err) {
      setError(errorText(err, 'Chưa gửi được Mức nhớ, vui lòng thử lại.'));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Screen width="reading" bottomSpace={130 + insets.bottom}>
        <FlipCard
          cardId={card.id}
          prompt={card.front}
          answer={card.back}
          onFlip={(revealed) => revealed && setS((cur) => reveal(cur))}
        />
        {error && <InlineError>{error}</InlineError>}
      </Screen>
      <ActionBar>
        <View style={styles.bar}>
          <View style={{ gap: 6 }}>
            <Txt variant="caption" tone="subtle">{progressLabel(s)}</Txt>
            <ProgressBar value={s.index} max={s.cards.length} label={`Đã ôn ${s.index} trên ${s.cards.length} thẻ`} />
          </View>
          {s.revealed && (
            <View style={styles.grades}>
              {GRADES.map((g) => (
                <Button
                  key={g.grade}
                  label={g.label}
                  variant={g.grade === 'GOOD' ? 'primary' : 'secondary'}
                  // Đang chờ một lượt: chỉ cho bấm lại đúng mức đó để gửi lại.
                  disabled={submit.isPending || (!!s.pending && s.pending.grade !== g.grade)}
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

const styles = StyleSheet.create({
  bar: { flex: 1, gap: space.sm },
  grades: { flexDirection: 'row', gap: space.sm },
});
