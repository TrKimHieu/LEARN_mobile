import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Button, Card, EmptyState, ErrorState, Field, InlineError, LoadingState, PageHeader, Screen, SectionTitle, Txt,
} from '@/components/ui';
import { CourseChips } from '@/features/flashcards/components/course-chips';
import { cardCountLabel, deckStats } from '@/features/flashcards/deck-stats';
import { useCreateDeck, useDecks, useDueCardCount } from '@/features/flashcards/flashcards-api';
import { errorText } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';

/** W1: Bộ thẻ tự tạo (ADR 005: tách khỏi ôn câu hỏi bài tập ở Tổng quan). */
export default function DecksScreen() {
  const decks = useDecks();
  const due = useDueCardCount();
  const create = useCreateDeck();
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return setFormError('Vui lòng nhập tên bộ thẻ.');
    setFormError(null);
    try {
      await create.mutateAsync({ title: trimmed, ...(courseId ? { courseId } : {}) });
      setName('');
      setCourseId(null);
    } catch (e) {
      setFormError(errorText(e, 'Không tạo được bộ thẻ, vui lòng thử lại.'));
    }
  }

  return (
    <Screen width="reading" topInset onRefresh={() => Promise.all([decks.refetch(), due.refetch()])}>
      <PageHeader title="Thẻ" description="Bộ thẻ bạn tự tạo, ôn theo lịch nhắc lại." />

      {(due.data ?? 0) > 0 && (
        <Card>
          <View style={{ gap: space.md }}>
            <Txt variant="heading">Ôn thẻ hôm nay · {due.data} thẻ đến hạn</Txt>
            <Button label="Ôn ngay" onPress={() => router.push(routes.deckReview())} />
          </View>
        </Card>
      )}

      <Card>
        <View style={{ gap: space.md }}>
          <Field label="Tên bộ thẻ" value={name} onChangeText={setName} maxLength={120} error={formError ?? undefined} />
          <CourseChips value={courseId} onChange={setCourseId} />
          <Button label="Tạo bộ thẻ" icon="plus" loading={create.isPending} onPress={() => void onCreate()} />
        </View>
      </Card>

      <SectionTitle title="Bộ thẻ của bạn" />
      {decks.isLoading ? (
        <LoadingState rows={3} height={72} label="Đang tải bộ thẻ" />
      ) : decks.error ? (
        <ErrorState title="Không tải được danh sách bộ thẻ" description={errorText(decks.error, 'Vui lòng thử lại.')} onRetry={() => decks.refetch()} />
      ) : !decks.data?.decks.length ? (
        <EmptyState title="Chưa có bộ thẻ nào" description="Tạo bộ thẻ đầu tiên ở trên." />
      ) : (
        decks.data.decks.map((d) => (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityLabel={`Mở bộ thẻ ${d.title}`}
            onPress={() => router.push(routes.deck(d.id))}
          >
            <Card>
              <View style={{ gap: space.xs }}>
                <Txt variant="bodyStrong" numberOfLines={2}>{d.title}</Txt>
                <Txt variant="caption" tone="subtle">
                  {cardCountLabel(d.cardCount)} · {deckStats(d).map((x) => `${x.label} ${x.value}`).join(' · ')}
                </Txt>
              </View>
            </Card>
          </Pressable>
        ))
      )}
      {create.isError && !formError && <InlineError>{errorText(create.error, 'Không tạo được bộ thẻ.')}</InlineError>}
    </Screen>
  );
}
