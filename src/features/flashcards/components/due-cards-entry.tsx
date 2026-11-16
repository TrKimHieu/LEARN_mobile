import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';
import { useDueCardCount } from '../flashcards-api';

/** Lối vào ôn thẻ tự tạo ở Tổng quan; chỉ hiện khi có thẻ đến hạn (tách khỏi "Ôn hôm nay" câu hỏi, ADR 005). */
export function DueCardsEntry() {
  const { data } = useDueCardCount();
  if (!data) return null;
  return (
    <Card>
      <View style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Txt variant="heading">Ôn thẻ</Txt>
          <Txt variant="small" tone="subtle">{data} thẻ tự tạo đến hạn</Txt>
        </View>
        <Button label="Ôn thẻ ngay" variant="secondary" onPress={() => router.push(routes.deckReview())} />
      </View>
    </Card>
  );
}
