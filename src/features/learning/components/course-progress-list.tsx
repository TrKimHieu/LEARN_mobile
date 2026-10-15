import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { ProgressCourse } from '@/contracts';
import { CourseCover } from '@/components/course-cover';
import { Card, Divider, ProgressBar, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { radius, space } from '@/theme/tokens';

/** Danh sách khóa kèm tiến độ, gói trong một thẻ, chạm để mở khóa. */
export function CourseProgressList({ courses }: { courses: ProgressCourse[] }) {
  return (
    <Card padded={false}>
      {courses.map((c, i) => (
        <View key={c.courseId}>
          {i > 0 && <Divider />}
          <CourseRow course={c} />
        </View>
      ))}
    </Card>
  );
}

function CourseRow({ course }: { course: ProgressCourse }) {
  return (
    <Card
      padded={false}
      style={styles.row}
      onPress={() => router.push(routes.course(course.courseId))}
      accessibilityLabel={`${course.courseTitle}, ${course.completed} trên ${course.total} bài`}
    >
      <CourseCover
        id={course.courseId}
        title={course.courseTitle}
        style={{ width: 44, height: 44, borderRadius: radius.control }}
        initialSize={20}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.head}>
          <Txt variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>
            {course.courseTitle}
          </Txt>
          <Txt variant="caption" tone="subtle" style={{ fontVariant: ['tabular-nums'] }}>
            {course.percent === 100 ? 'Hoàn thành' : `${course.completed}/${course.total} bài`}
          </Txt>
        </View>
        <ProgressBar value={course.completed} max={Math.max(course.total, 1)} height={4} />
      </View>
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
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
});
