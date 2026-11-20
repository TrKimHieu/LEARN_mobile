import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';
import { isFriendsUnavailable, useLeaderboard } from '../friends-api';

/** Lối vào Bạn học ở tab Tiến trình (T5-7). Ẩn khi máy chủ chưa có tính năng này. */
export function FriendsEntry() {
  const board = useLeaderboard();
  if (isFriendsUnavailable(board.error)) return null;
  const me = board.data?.entries.find((e) => e.me);
  const others = (board.data?.entries.length ?? 1) - 1;
  const sub = !board.data
    ? 'Xếp hạng XP tuần cùng bạn bè'
    : others === 0
      ? 'Mời bạn bè cùng học'
      : `Hạng ${me?.rank ?? '–'}/${others + 1} tuần này · ${me?.xp ?? 0} XP`;
  return (
    <Card style={styles.card} onPress={() => router.push(routes.friends)} accessibilityLabel={`Bạn học, ${sub}`}>
      <Icon name="trophy" size={22} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="smallStrong">Bạn học</Txt>
        <Txt variant="caption" tone="subtle">
          {sub}
        </Txt>
      </View>
      <Icon name="chevron-right" size={20} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
