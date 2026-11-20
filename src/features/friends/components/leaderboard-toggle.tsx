import { Card, Segmented, Txt } from '@/components/ui';
import { space } from '@/theme/tokens';
import { useFriends, useLeaderboardHidden } from '../friends-api';

/** Ẩn mình khỏi bảng xếp hạng của bạn bè (vẫn kết bạn được). Chỉ hiện khi máy chủ có bạn học. */
export function LeaderboardToggle() {
  const friends = useFriends();
  const update = useLeaderboardHidden();
  if (!friends.data) return null;
  const hidden = update.isPending ? update.variables : friends.data.leaderboardHidden;
  return (
    <Card style={{ gap: space.md }}>
      <Txt variant="heading">Bảng xếp hạng</Txt>
      <Txt variant="small" tone="subtle">
        Bạn bè thấy XP tuần của bạn. Ẩn thì vẫn kết bạn được.
      </Txt>
      <Segmented
        label="Hiện trên bảng xếp hạng của bạn bè"
        value={hidden ? 'hidden' : 'shown'}
        options={[{ value: 'shown', label: 'Hiện' }, { value: 'hidden', label: 'Ẩn' }] as const}
        disabled={update.isPending}
        onChange={(v) => update.mutate(v === 'hidden')}
      />
    </Card>
  );
}
