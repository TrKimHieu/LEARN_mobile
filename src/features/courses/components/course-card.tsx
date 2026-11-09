import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { CourseSummary } from '@/contracts';
import { CourseCover } from '@/components/course-cover';
import { Badge, Card, ProgressBar, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { radius, space } from '@/theme/tokens';

/**
 * Thẻ khóa học — như web: bìa là vật thể, chữ nằm ngay dưới. "Nháp" chỉ hiện khi khác thường;
 * "Sẵn sàng" là mặc định, gắn nhãn cho nó ở mọi thẻ chỉ là nhiễu.
 */
export function CourseCard({ course }: { course: CourseSummary }) {
  const { completed, total } = course.progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <Card
      padded={false}
      onPress={() => router.push(routes.course(course.id))}
      accessibilityLabel={`${course.title}, ${total > 0 ? `${completed} trên ${total} bài` : 'chưa có bài học'}`}
    >
      <View>
        <CourseCover id={course.id} title={course.title} style={{ aspectRatio: 16 / 9 }} initialSize={48} />
        {course.status !== 'READY' && (
          <View style={styles.badge}>
            <Badge label={course.status === 'DRAFT' ? 'Nháp' : 'Đã lưu trữ'} tone="outline" />
          </View>
        )}
        {total > 0 && (
          <View style={styles.bar}>
            <ProgressBar value={completed} max={total} height={4} />
          </View>
        )}
      </View>
      <View style={{ padding: space.lg, gap: 4 }}>
        <Txt variant="bodyStrong" numberOfLines={2}>
          {course.title}
        </Txt>
        {course.description && (
          <Txt variant="small" tone="subtle" numberOfLines={2}>
            {course.description}
          </Txt>
        )}
        <Txt variant="caption" tone="subtle" style={{ marginTop: 4 }}>
          {total > 0 ? `${completed}/${total} bài${percent === 100 ? ', đã xong' : ''}` : 'Chưa có bài học'} ·{' '}
          {course.documentCount} tài liệu
        </Txt>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', left: space.md, top: space.md, borderRadius: radius.pill },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
