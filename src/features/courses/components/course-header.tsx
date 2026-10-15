import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { CourseDetail, LessonSummary } from '@/contracts';
import { CourseCover } from '@/components/course-cover';
import { Button, ProgressBar, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

/**
 * Đầu trang khóa học: bìa, tên, nút học tiếp và dải số liệu. `resume` là bài nút chính mở — màn
 * chọn (đang học dở → chưa bắt đầu → bài đầu để xem lại).
 */
export function CourseHeader({
  course,
  lessonCount,
  completedCount,
  documentCount,
  resume,
}: {
  course: CourseDetail;
  lessonCount: number;
  completedCount: number;
  documentCount: number;
  resume?: Pick<LessonSummary, 'id' | 'title' | 'progressStatus'>;
}) {
  const p = usePalette();
  const allDone = completedCount === lessonCount && lessonCount > 0;
  const resumeLabel = allDone
    ? 'Xem lại'
    : resume?.progressStatus === 'NOT_STARTED' && completedCount === 0
      ? 'Bắt đầu học'
      : 'Tiếp tục học';

  return (
    <>
      <View style={{ gap: space.md }}>
        <CourseCover id={course.id} title={course.title} style={styles.cover} initialSize={44} />
        <Txt variant="display" accessibilityRole="header">
          {course.title}
        </Txt>
        {course.description && (
          <Txt variant="body" tone="subtle">
            {course.description}
          </Txt>
        )}
        {resume && (
          <View style={{ gap: space.sm, marginTop: space.xs }}>
            <Button
              label={resumeLabel}
              iconRight="arrow-right"
              fullWidth
              onPress={() => router.push(routes.lesson(course.id, resume.id))}
            />
            <Txt variant="small" tone="subtle" numberOfLines={1}>
              {allDone ? 'Mở lại ' : 'Tiếp theo: '}
              <Txt variant="smallStrong">{resume.title}</Txt>
            </Txt>
          </View>
        )}
      </View>

      <View style={[styles.facts, { borderColor: p.line }]}>
        <View style={{ flex: 1.4, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            Tiến độ
          </Txt>
          <Txt variant="smallStrong" style={{ fontVariant: ['tabular-nums'] }}>
            {completedCount}/{lessonCount} bài
          </Txt>
          {lessonCount > 0 && (
            <ProgressBar
              value={completedCount}
              max={lessonCount}
              height={4}
              label={`Đã hoàn thành ${completedCount} trên ${lessonCount} bài`}
            />
          )}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            Tài liệu
          </Txt>
          <Txt variant="smallStrong">{documentCount}</Txt>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            Ngôn ngữ
          </Txt>
          <Txt variant="smallStrong">{course.language === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'}</Txt>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cover: { height: 140, borderRadius: radius.card },
  facts: {
    flexDirection: 'row',
    gap: space.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: space.md,
  },
});
