import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Segmented, Txt } from '@/components/ui';
import { space } from '@/theme/tokens';
import { REMINDER_HOUR, useReviewReminder } from '../reminder';
import { useDueReviews } from '../reviews-api';

/** Công tắc nhắc ôn trong Cài đặt (W3). */
export function ReminderToggle() {
  const r = useReviewReminder();
  return (
    <Card style={{ gap: space.md }}>
      <Txt variant="heading">Nhắc học</Txt>
      <Txt variant="small" tone="subtle">
        Thông báo lúc {REMINDER_HOUR}:00 khi hôm nay còn việc chưa xong. Cần cho phép thông báo trên máy này.
      </Txt>
      <Segmented
        label="Nhắc học"
        value={r.enabled ? 'on' : 'off'}
        options={[{ value: 'off', label: 'Tắt' }, { value: 'on', label: 'Bật' }] as const}
        onChange={(v) => void r.set(v === 'on')}
      />
    </Card>
  );
}

/** Lối vào ở Tổng quan và cuối màn bài học (T2-7): chỉ hiện khi có thẻ đến hạn. */
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
