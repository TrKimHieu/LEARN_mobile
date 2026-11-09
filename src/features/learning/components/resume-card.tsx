import { router } from 'expo-router';
import { View } from 'react-native';
import type { ProgressCourse } from '@/contracts';
import { CourseCover } from '@/components/course-cover';
import { Button, Card, ProgressBar, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { useLessons } from '../learning-api';
import { resumeLesson } from '../progress';

/**
 * Thẻ "Học tiếp" — bài kế tiếp = bài đang học dở, không có thì bài chưa bắt đầu đầu tiên. Khi
 * danh sách bài chưa tải xong, nút vẫn dẫn tới trang khóa — không bao giờ là nút chết. Khác web:
 * bố cục thẻ native, màu lấy từ token website (ADR 002).
 */
export function ResumeCard({ course }: { course: ProgressCourse }) {
  const p = usePalette();
  const lessons = useLessons(course.courseId);
  const list = lessons.data?.lessons ?? [];
  const lesson = resumeLesson(list);
  const index = lesson ? list.indexOf(lesson) : -1;

  return (
    <Card padded={false}>
      <CourseCover id={course.courseId} title={course.courseTitle} style={{ height: 96 }} initialSize={34} />
      <View style={{ padding: space.lg, gap: space.sm }}>
        <Txt variant="caption" tone="subtle" style={{ letterSpacing: 0.6 }}>
          HỌC TIẾP
        </Txt>
        <Txt variant="heading">{lesson ? lesson.title : course.courseTitle}</Txt>
        <Txt variant="small" tone="subtle">
          {lesson ? `${course.courseTitle} · Bài ${index + 1}/${list.length}` : `${course.completed}/${course.total} bài`}
        </Txt>
        <ProgressBar
          value={course.completed}
          max={Math.max(course.total, 1)}
          label={`${course.courseTitle}: ${course.completed} trên ${course.total} bài`}
          track={p.track}
        />
        <Button
          label={lesson?.progressStatus === 'IN_PROGRESS' ? 'Tiếp tục bài học' : 'Bắt đầu bài học'}
          iconRight="arrow-right"
          fullWidth
          style={{ marginTop: space.sm }}
          onPress={() =>
            router.push(lesson ? routes.lesson(course.courseId, lesson.id) : routes.course(course.courseId))
          }
        />
      </View>
    </Card>
  );
}
