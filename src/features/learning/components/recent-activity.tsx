import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { HistoryPage } from '@/contracts';
import { Card, Divider, Icon, Txt } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';

/** Các lần nộp bài gần đây; chạm một dòng để mở lại bài học đó. */
export function RecentActivity({ items }: { items: HistoryPage['items'] }) {
  if (items.length === 0) {
    return (
      <Txt variant="small" tone="subtle">
        Chưa có lần làm bài nào. Kết quả bài tập sẽ hiện ở đây.
      </Txt>
    );
  }
  return (
    <Card padded={false}>
      {items.map((item, i) => (
        <View key={item.id}>
          {i > 0 && <Divider />}
          <Card
            padded={false}
            style={styles.row}
            onPress={() => router.push(routes.lesson(item.courseId, item.lessonId))}
            accessibilityLabel={`${item.lessonTitle}, ${item.score} trên ${item.maxScore} điểm, ${item.passed ? 'đạt' : 'chưa đạt'}`}
          >
            <Icon name={item.passed ? 'circle-check' : 'retry'} size={20} filled={item.passed} />
            <View style={{ flex: 1 }}>
              <Txt variant="small" numberOfLines={1}>
                {item.lessonTitle}
              </Txt>
              <Txt variant="caption" tone="subtle">
                {item.score}/{item.maxScore} điểm · {item.passed ? 'đạt' : 'chưa đạt'} · {relativeTime(item.createdAt)}
              </Txt>
            </View>
          </Card>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 0,
    borderRadius: 0,
  },
});
