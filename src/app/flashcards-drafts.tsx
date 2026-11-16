import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { FlashcardDraft } from '@/contracts';
import {
  Button, Card, Divider, EmptyState, ErrorState, Field, Icon, InlineError, LoadingState, Screen, SectionTitle, Txt,
} from '@/components/ui';
import { CARD_LIMITS, counter, sideError } from '@/features/flashcards/card-limits';
import { acceptLabel, selectAll, toggle, withoutIds } from '@/features/flashcards/drafts-logic';
import { useAcceptDrafts, useDecks, useDeleteDraft, useDrafts, usePatchDraft } from '@/features/flashcards/flashcards-api';
import { errorText } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** W2: duyệt Thẻ nháp: sửa, bỏ bớt, chấp nhận vào bộ có sẵn hoặc bộ mới. */
export default function DraftsScreen() {
  const { job } = useLocalSearchParams<{ job?: string }>();
  const drafts = useDrafts(job);
  const decks = useDecks();
  const accept = useAcceptDrafts();
  const list = drafts.data?.drafts ?? [];
  // Mặc định chọn hết (web: selectAll); chỉ giữ những id người dùng bỏ chọn, nên thẻ mới tải về tự được chọn.
  const [unselected, setUnselected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string | 'new'>('new');
  const [newTitle, setNewTitle] = useState('Thẻ AI');
  const [error, setError] = useState<string | null>(null);
  const selected = new Set([...selectAll(list.map((d) => d.id))].filter((id) => !unselected.has(id)));

  async function onAccept() {
    if (selected.size === 0) return;
    if (target === 'new' && !newTitle.trim()) return setError('Vui lòng nhập tên bộ thẻ mới.');
    setError(null);
    try {
      const res = await accept.mutateAsync({
        draftIds: [...selected],
        ...(target === 'new' ? { newDeckTitle: newTitle.trim() } : { deckId: target }),
      });
      router.replace(routes.deck(res.deckId));
    } catch (e) {
      setError(errorText(e, 'Không thêm được thẻ, vui lòng thử lại.'));
    }
  }

  if (drafts.isLoading) return <Screen width="reading"><LoadingState rows={3} height={72} label="Đang tải thẻ nháp" /></Screen>;
  if (drafts.error) {
    return (
      <Screen width="reading">
        <ErrorState title="Không tải được thẻ nháp" description={errorText(drafts.error, 'Vui lòng thử lại.')} onRetry={() => drafts.refetch()} />
      </Screen>
    );
  }
  if (list.length === 0) {
    return <Screen width="reading"><EmptyState title="Không có thẻ nháp nào" description="Sinh thẻ bằng AI từ một bài học hoặc tài liệu." /></Screen>;
  }

  return (
    <Screen width="reading">
      <Card padded={false}>
        {list.map((d, i) => (
          <View key={d.id}>
            {i > 0 && <Divider />}
            <DraftRow
              draft={d}
              checked={selected.has(d.id)}
              onToggle={() => setUnselected((s) => toggle(s, d.id))}
              onDeleted={() => setUnselected((s) => withoutIds(s, [d.id]))}
            />
          </View>
        ))}
      </Card>

      <SectionTitle title="Thêm vào" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Button label="Bộ thẻ mới" size="sm" variant={target === 'new' ? 'primary' : 'secondary'} onPress={() => setTarget('new')} />
        {(decks.data?.decks ?? []).map((k) => (
          <Button key={k.id} label={k.title} size="sm" variant={target === k.id ? 'primary' : 'secondary'} onPress={() => setTarget(k.id)} />
        ))}
      </ScrollView>
      {target === 'new' && <Field label="Tên bộ thẻ mới" value={newTitle} onChangeText={setNewTitle} maxLength={CARD_LIMITS.title} />}
      {error && <InlineError>{error}</InlineError>}
      <Button label={acceptLabel(selected.size)} disabled={selected.size === 0} loading={accept.isPending} onPress={() => void onAccept()} />
    </Screen>
  );
}

function DraftRow({ draft, checked, onToggle, onDeleted }: {
  draft: FlashcardDraft; checked: boolean; onToggle: () => void; onDeleted: () => void;
}) {
  const p = usePalette();
  const patch = usePatchDraft();
  const remove = useDeleteDraft();
  const [edit, setEdit] = useState<{ front: string; back: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!edit) return;
    const e = sideError(edit.front, edit.back);
    if (e) return setErr(e);
    await patch.mutateAsync({ id: draft.id, front: edit.front.trim(), back: edit.back.trim() })
      .then(() => { setEdit(null); setErr(null); })
      .catch((x) => setErr(errorText(x, 'Không lưu được thẻ, vui lòng thử lại.')));
  }

  return (
    <View style={{ padding: space.md, gap: space.sm }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`Chọn thẻ ${draft.front}`}
        onPress={onToggle}
        style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}
      >
        <Icon name={checked ? 'check' : 'plus'} size={20} color={checked ? p.primary : p.fgSubtle} />
        {edit ? null : (
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="smallStrong">{draft.front}</Txt>
            <Txt variant="small" tone="subtle">{draft.back}</Txt>
          </View>
        )}
      </Pressable>
      {edit && (
        <>
          <Field label="Mặt trước" value={edit.front} onChangeText={(front) => setEdit({ ...edit, front })} multiline hint={counter(edit.front, CARD_LIMITS.front)} />
          <Field label="Mặt sau" value={edit.back} onChangeText={(back) => setEdit({ ...edit, back })} multiline hint={counter(edit.back, CARD_LIMITS.back)} />
        </>
      )}
      {err && <InlineError>{err}</InlineError>}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {edit ? (
          <>
            <Button label="Lưu" size="sm" loading={patch.isPending} onPress={() => void save()} />
            <Button label="Huỷ" size="sm" variant="ghost" onPress={() => setEdit(null)} />
          </>
        ) : (
          <>
            <Button label="Chỉnh sửa" size="sm" variant="secondary" icon="edit" onPress={() => setEdit({ front: draft.front, back: draft.back })} />
            <Button
              label="Bỏ"
              size="sm"
              variant="ghost"
              icon="trash"
              loading={remove.isPending}
              onPress={() => remove.mutate(draft.id, {
                onSuccess: onDeleted,
                onError: (x) => setErr(errorText(x, 'Không bỏ được thẻ nháp, vui lòng thử lại.')),
              })}
            />
          </>
        )}
      </View>
    </View>
  );
}
