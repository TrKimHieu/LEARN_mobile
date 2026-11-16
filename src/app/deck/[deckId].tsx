import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Flashcard } from '@/contracts';
import { Button, Card, Divider, EmptyState, ErrorState, Field, InlineError, LoadingState, Screen, SectionTitle, Txt } from '@/components/ui';
import { CourseChips } from '@/features/flashcards/components/course-chips';
import { CARD_LIMITS, counter, sideError } from '@/features/flashcards/card-limits';
import { cardCountLabel, deckStats } from '@/features/flashcards/deck-stats';
import {
  useCreateCard, useDeck, useDecks, useDeleteCard, useDeleteDeck, usePatchCard, usePatchDeck,
} from '@/features/flashcards/flashcards-api';
import { errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';


export default function DeckScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const deck = useDeck(deckId);
  const patchDeck = usePatchDeck(deckId);
  const deleteDeck = useDeleteDeck(deckId);
  const createCard = useCreateCard(deckId);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  if (deck.isLoading) return <Screen width="reading"><LoadingState rows={3} height={64} label="Đang tải bộ thẻ" /></Screen>;
  if (deck.error || !deck.data) {
    return (
      <Screen width="reading">
        <ErrorState title="Không tải được bộ thẻ" description={errorText(deck.error, 'Vui lòng thử lại.')} onRetry={() => deck.refetch()} />
      </Screen>
    );
  }
  const d = deck.data.deck;
  const cards = deck.data.cards;

  async function onAdd() {
    const err = sideError(front, back);
    if (err) return setAddError(err);
    setAddError(null);
    try {
      await createCard.mutateAsync({ front: front.trim(), back: back.trim() });
      setFront('');
      setBack('');
    } catch (e) {
      setAddError(errorText(e, 'Không thêm được thẻ, vui lòng thử lại.'));
    }
  }

  async function onDeleteDeck() {
    const ok = await confirmAction({
      title: 'Xoá bộ thẻ này?',
      message: 'Mọi thẻ và lịch ôn trong bộ sẽ mất.',
      confirmLabel: 'Xoá bộ thẻ',
    });
    if (!ok) return;
    await deleteDeck.mutateAsync().then(() => router.back()).catch(() => undefined);
  }

  return (
    <Screen width="reading" onRefresh={() => deck.refetch()}>
      <Stack.Screen options={{ title: d.title }} />
      <Card>
        <View style={{ gap: space.md }}>
          {renaming === null ? (
            <Txt variant="title">{d.title}</Txt>
          ) : (
            <Field label="Tên bộ thẻ" value={renaming} onChangeText={setRenaming} maxLength={CARD_LIMITS.title} autoFocus />
          )}
          <Txt variant="caption" tone="subtle">
            {cardCountLabel(d.cardCount)} · {deckStats(d).map((x) => `${x.label} ${x.value}`).join(' · ')}
          </Txt>
          <CourseChips value={d.courseId ?? null} onChange={(courseId) => patchDeck.mutate({ courseId })} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {d.dueCount > 0 && <Button label="Ôn tập" onPress={() => router.push(routes.deckReview(d.id))} />}
            {renaming === null ? (
              <Button label="Đổi tên" variant="secondary" icon="edit" onPress={() => setRenaming(d.title)} />
            ) : (
              <Button
                label="Lưu tên"
                loading={patchDeck.isPending}
                disabled={!renaming.trim()}
                onPress={() => patchDeck.mutate({ title: renaming.trim() }, { onSuccess: () => setRenaming(null) })}
              />
            )}
            <Button label="Xoá bộ thẻ" variant="danger" icon="trash" loading={deleteDeck.isPending} onPress={() => void onDeleteDeck()} />
          </View>
          {patchDeck.error && <InlineError>{errorText(patchDeck.error, 'Không lưu được, vui lòng thử lại.')}</InlineError>}
          {deleteDeck.error && <InlineError>{errorText(deleteDeck.error, 'Không xoá được bộ thẻ, vui lòng thử lại.')}</InlineError>}
        </View>
      </Card>

      <Card>
        <View style={{ gap: space.md }}>
          <Field label="Mặt trước" value={front} onChangeText={setFront} multiline maxLength={CARD_LIMITS.front} hint={counter(front, CARD_LIMITS.front)} />
          <Field label="Mặt sau" value={back} onChangeText={setBack} multiline maxLength={CARD_LIMITS.back} hint={counter(back, CARD_LIMITS.back)} />
          {addError && <InlineError>{addError}</InlineError>}
          <Button label="Thêm thẻ" icon="plus" loading={createCard.isPending} onPress={() => void onAdd()} />
        </View>
      </Card>

      <SectionTitle title="Thẻ trong bộ" />
      {cards.length === 0 ? (
        <EmptyState title="Chưa có thẻ" description="Thêm thẻ ở trên để bắt đầu ôn." />
      ) : (
        <Card padded={false}>
          {cards.map((c, i) => (
            <View key={c.id}>
              {i > 0 && <Divider />}
              <CardRow card={c} deckId={d.id} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function CardRow({ card, deckId }: { card: Flashcard; deckId: string }) {
  const patch = usePatchCard();
  const remove = useDeleteCard();
  const decks = useDecks();
  const [edit, setEdit] = useState<{ front: string; back: string } | null>(null);
  const [moving, setMoving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const others = (decks.data?.decks ?? []).filter((x) => x.id !== deckId);

  async function save() {
    if (!edit) return;
    const e = sideError(edit.front, edit.back);
    if (e) return setErr(e);
    setErr(null);
    await patch.mutateAsync({ cardId: card.id, front: edit.front.trim(), back: edit.back.trim() })
      .then(() => setEdit(null))
      .catch((x) => setErr(errorText(x, 'Không lưu được thẻ, vui lòng thử lại.')));
  }

  async function del() {
    const ok = await confirmAction({ title: 'Xoá thẻ này?', message: 'Lịch ôn của thẻ cũng mất.', confirmLabel: 'Xoá' });
    if (ok) remove.mutate(card.id, { onError: (x) => setErr(errorText(x, 'Không xoá được thẻ, vui lòng thử lại.')) });
  }

  return (
    <View style={{ padding: space.md, gap: space.sm }}>
      {edit ? (
        <>
          <Field label="Mặt trước" value={edit.front} onChangeText={(front) => setEdit({ ...edit, front })} multiline hint={counter(edit.front, CARD_LIMITS.front)} />
          <Field label="Mặt sau" value={edit.back} onChangeText={(back) => setEdit({ ...edit, back })} multiline hint={counter(edit.back, CARD_LIMITS.back)} />
        </>
      ) : (
        <>
          <Txt variant="smallStrong">{card.front}</Txt>
          <Txt variant="small" tone="subtle">{card.back}</Txt>
        </>
      )}
      {err && <InlineError>{err}</InlineError>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {edit ? (
          <>
            <Button label="Lưu" size="sm" loading={patch.isPending} onPress={() => void save()} />
            <Button label="Huỷ" size="sm" variant="ghost" onPress={() => setEdit(null)} />
          </>
        ) : (
          <>
            <Button label="Chỉnh sửa" size="sm" variant="secondary" icon="edit" onPress={() => setEdit({ front: card.front, back: card.back })} />
            {others.length > 0 && <Button label="Chuyển bộ" size="sm" variant="secondary" onPress={() => setMoving((v) => !v)} />}
            <Button label="Xoá" size="sm" variant="ghost" icon="trash" accessibilityLabel={`Xoá thẻ ${card.front}`} onPress={() => void del()} />
          </>
        )}
      </View>
      {moving && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {others.map((o) => (
            <Button
              key={o.id}
              label={o.title}
              size="sm"
              variant="secondary"
              onPress={() => patch.mutate({ cardId: card.id, deckId: o.id }, { onSuccess: () => setMoving(false) })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
