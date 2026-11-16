import { useLocalSearchParams } from 'expo-router';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { CardReviewSession } from '@/features/flashcards/components/card-review-session';
import { useDueCards } from '@/features/flashcards/flashcards-api';
import { FocusHeaderButton } from '@/features/focus/focus-header-button';
import { errorText } from '@/lib/api-client';

/** `?deck=<id>` ôn một bộ; không có thì "Ôn hôm nay" gom mọi thẻ đến hạn. */
export default function DeckReviewScreen() {
  const { deck } = useLocalSearchParams<{ deck?: string }>();
  const due = useDueCards(deck ?? null);
  if (due.isLoading) {
    return <Screen width="reading"><LoadingState rows={1} height={220} label="Đang tải thẻ cần ôn" /></Screen>;
  }
  if (due.error || !due.data) {
    return (
      <Screen width="reading">
        <ErrorState title="Không tải được thẻ cần ôn" description={errorText(due.error, 'Vui lòng thử lại.')} onRetry={() => due.refetch()} />
      </Screen>
    );
  }
  return (
    <>
      <FocusHeaderButton />
      <CardReviewSession data={due.data} />
    </>
  );
}
