import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Txt } from '@/components/ui';
import { space } from '@/theme/tokens';
import { useDueReviews } from '../reviews-api';

/** Lối vào ở Tổng quan: chỉ hiện khi có thẻ đến hạn. */
export function ReviewEntry() {
  const { data } = useDueReviews();
  if (!data || data.dueCount <= 0) return null;
  return (
    <Card>
      <View style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Txt variant="heading">Ôn hôm nay</Txt>
          <Txt variant="small" tone="subtle">
            {data.dueCount} thẻ đến hạn
          </Txt>
        </View>
        <Button label="Ôn ngay" onPress={() => router.push('/review' as Href)} />
      </View>
    </Card>
  );
}
