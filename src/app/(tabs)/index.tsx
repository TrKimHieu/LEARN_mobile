import { router } from 'expo-router';
import { View } from 'react-native';
import { UpdateNotice } from '@/components/update-notice';
import {
  Button,
  EmptyState,
  ErrorState,
  InlineError,
  PageHeader,
  Screen,
  SectionTitle,
  Skeleton,
  Txt,
} from '@/components/ui';
import { CourseProgressList } from '@/features/learning/components/course-progress-list';
import { ProgressStats } from '@/features/learning/components/progress-stats';
import { RecentActivity } from '@/features/learning/components/recent-activity';
import { ResumeCard } from '@/features/learning/components/resume-card';
import { useProgressCourses, useProgressHistory, useProgressOverview } from '@/features/learning/learning-api';
import { orderCourses } from '@/features/learning/progress';
import { errorDetail, errorText } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';

const HISTORY_LIMIT = 5;

/**
 * Tổng quan — cùng câu hỏi với dashboard web (ADR 012): "học tiếp cái gì?". Mỗi số liệu hiện
 * đúng một lần; thẻ "Học tiếp" dẫn thẳng vào bài kế tiếp.
 */
export default function OverviewScreen() {
  const overview = useProgressOverview();
  const courses = useProgressCourses();
  const history = useProgressHistory(HISTORY_LIMIT);

  const ordered = orderCourses(courses.data?.courses ?? []);
  const next = ordered.find((c) => c.percent < 100);

  const refresh = () => Promise.all([overview.refetch(), courses.refetch(), history.refetch()]);

  if (overview.isLoading) {
    return (
      <Screen topInset>
        <View accessible accessibilityLabel="Đang tải tổng quan" style={{ gap: space.lg }}>
          <Skeleton height={36} width="50%" />
          <Skeleton height={150} />
          <Skeleton height={140} />
        </View>
      </Screen>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <Screen topInset onRefresh={refresh}>
        <PageHeader title="Tổng quan" />
        <ErrorState
          title="Không tải được tổng quan"
          description={errorText(overview.error, 'Vui lòng thử lại.')}
          detail={errorDetail(overview.error)}
          onRetry={() => void overview.refetch()}
        />
      </Screen>
    );
  }

  const data = overview.data;

  if (data.courseCount === 0) {
    return (
      <Screen topInset onRefresh={refresh}>
        <PageHeader
          title="Tổng quan"
          description="Tạo khóa học hoặc tiếp tục học từ tài liệu đã có."
        />
        <EmptyState
          title="Chưa có khóa học nào"
          description="Bạn có thể tạo khóa học. Nhập tài liệu mới trên điện thoại đang được chuẩn bị; tài liệu thêm từ website vẫn dùng được."
          action={{ label: 'Tạo khóa học đầu tiên', icon: 'plus', onPress: () => router.push(routes.newCourse) }}
        />
      </Screen>
    );
  }

  return (
    <Screen topInset onRefresh={refresh}>
      <PageHeader
        title="Tổng quan"
        description={
          <Txt variant="small" tone="subtle">
            {data.totalLessons > 0 ? (
              <>
                Bạn đã xong <Txt variant="smallStrong">{data.completedLessons}</Txt> trên {data.totalLessons} bài
                {data.activeStreak > 0 && (
                  <>
                    , học liên tiếp <Txt variant="smallStrong">{data.activeStreak} ngày</Txt>
                  </>
                )}
                .
              </>
            ) : (
              'Các khóa của bạn chưa có bài học nào. Mở khóa có tài liệu đã xử lý để sinh bài học.'
            )}
          </Txt>
        }
      />

      <UpdateNotice />
      {courses.isError && <InlineError>{errorText(courses.error, 'Không tải được khóa học đang dở.')}</InlineError>}
      {courses.isLoading && <Skeleton height={150} />}
      {next && <ResumeCard course={next} />}

      <ProgressStats data={data} />

      <View>
        <SectionTitle
          title="Khóa học của bạn"
          action={<Button label="Tất cả" variant="ghost" size="sm" onPress={() => router.navigate('/courses')} />}
        />
        {courses.data && ordered.length === 0 && (
          <Txt variant="small" tone="subtle">
            Các khóa chưa có bài học nào.
          </Txt>
        )}
        {ordered.length > 0 && <CourseProgressList courses={ordered.slice(0, 5)} />}
      </View>

      <View>
        <SectionTitle
          title="Hoạt động gần đây"
          action={<Button label="Xem hết" variant="ghost" size="sm" onPress={() => router.navigate('/progress')} />}
        />
        {history.isLoading && <Skeleton height={160} />}
        {history.isError && <InlineError>{errorText(history.error, 'Không tải được hoạt động.')}</InlineError>}
        {history.data && <RecentActivity items={history.data.items} />}
      </View>
    </Screen>
  );
}
