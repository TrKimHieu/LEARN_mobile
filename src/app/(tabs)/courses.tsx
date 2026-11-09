import { router } from 'expo-router';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Screen,
  Grid,
} from '@/components/ui';
import { CourseCard } from '@/features/courses/components/course-card';
import { useCourses } from '@/features/courses/courses-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { useLayout } from '@/theme/layout';
import { space } from '@/theme/tokens';

export default function CoursesScreen() {
  const { data, isLoading, isError, error, refetch } = useCourses();
  const layout = useLayout();
  const count = data?.courses.length ?? 0;

  return (
    <Screen topInset onRefresh={refetch}>
      <PageHeader
        title="Khóa học"
        description={
          count > 0
            ? `${count} khóa học. Mỗi khóa gom tài liệu nguồn và lộ trình bài học sinh từ đó.`
            : 'Mỗi khóa gom tài liệu nguồn và lộ trình bài học sinh từ đó.'
        }
        action={<Button label="Tạo" icon="plus" size="sm" onPress={() => router.push(routes.newCourse)} accessibilityLabel="Tạo khóa học" />}
      />

      {isLoading && <LoadingState rows={3} height={220} label="Đang tải khóa học" />}

      {isError && (
        <ErrorState
          title="Không tải được danh sách khóa học"
          description={errorText(error, 'Vui lòng thử lại.')}
          detail={errorDetail(error)}
          onRetry={() => void refetch()}
        />
      )}

      {data && data.courses.length === 0 && (
        <EmptyState
          title="Chưa có khóa học nào"
          description="Tạo khóa học đầu tiên và tải tài liệu lên để AI sinh bài học cho bạn."
          action={{ label: 'Tạo khóa học đầu tiên', icon: 'plus', onPress: () => router.push(routes.newCourse) }}
        />
      )}

      {data && data.courses.length > 0 && (
        <Grid columns={layout.columns} gap={space.xl}>
          {data.courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </Grid>
      )}
    </Screen>
  );
}
