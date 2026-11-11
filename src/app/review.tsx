import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { ReviewSession } from '@/features/reviews/components/review-session';
import { useDueReviews } from '@/features/reviews/reviews-api';
import { errorDetail, errorText } from '@/lib/api-client';

export default function ReviewScreen() {
  const due = useDueReviews();

  if (due.isLoading) {
    return (
      <Screen width="reading">
        <LoadingState rows={2} height={160} label="Đang tải thẻ ôn" />
      </Screen>
    );
  }

  if (due.isError || !due.data) {
    return (
      <Screen width="reading">
        <ErrorState
          title="Không tải được thẻ ôn"
          description={errorText(due.error, 'Vui lòng thử lại.')}
          detail={errorDetail(due.error)}
          onRetry={() => void due.refetch()}
        />
      </Screen>
    );
  }

  return <ReviewSession cards={due.data.cards} />;
}
