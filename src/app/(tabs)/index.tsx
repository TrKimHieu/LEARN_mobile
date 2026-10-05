import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { ProgressCourse } from '@/contracts';
import { CourseCover } from '@/components/course-cover';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  InlineError,
  Notice,
  PageHeader,
  ProgressBar,
  Screen,
  SectionTitle,
  Skeleton,
  Txt,
  type IconName,
} from '@/components/ui';
import {
  useLessons,
  useProgressCourses,
  useProgressHistory,
  useProgressOverview,
} from '@/features/learning/learning-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useServerMeta } from '@/lib/server-meta';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const HISTORY_LIMIT = 5;

/** Khóa đang dở, gần xong nhất trước — đẩy người học về đích; rồi tới khóa chưa bắt đầu. */
function rank(c: ProgressCourse) {
  if (c.percent > 0 && c.percent < 100) return 0;
  if (c.percent === 0) return 1;
  return 2;
}

/**
 * Tổng quan — cùng câu hỏi với dashboard web (ADR 012): "học tiếp cái gì?". Mỗi số liệu hiện
 * đúng một lần; thẻ "Học tiếp" dẫn thẳng vào bài kế tiếp.
 */
export default function OverviewScreen() {
  const overview = useProgressOverview();
  const courses = useProgressCourses();
  const history = useProgressHistory(HISTORY_LIMIT);
  const { outdated } = useServerMeta();

  const all = courses.data?.courses ?? [];
  const ordered = [...all].sort((a, b) => rank(a) - rank(b) || b.percent - a.percent);
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
          description="Bắt đầu bằng một khóa học: đặt tên, tải tài liệu lên, rồi để AI dựng lộ trình bài học."
        />
        <EmptyState
          title="Chưa có khóa học nào"
          description="Tạo khóa học đầu tiên và tải tài liệu lên. AI sẽ sinh bài học và bài tập từ chính nội dung đó."
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
              'Các khóa của bạn chưa có bài học nào. Tải tài liệu lên để AI dựng lộ trình.'
            )}
          </Txt>
        }
      />

      {outdated && <UpdateNotice />}
      {courses.isError && <InlineError>{errorText(courses.error, 'Không tải được khóa học đang dở.')}</InlineError>}
      {courses.isLoading && <Skeleton height={150} />}
      {next && <ResumeCard course={next} />}

      <View style={styles.stats}>
        <Stat icon="flame" label="Chuỗi ngày học" value={String(data.activeStreak)} sub="ngày liên tiếp" />
        <Stat icon="book-check" label="Bài đã xong" value={`${data.completedLessons}/${data.totalLessons}`} />
        <Stat
          icon="star"
          label="Điểm trung bình"
          value={data.averageScore !== null ? data.averageScore.toFixed(1) : 'Chưa có'}
          sub={data.averageScore === null ? 'chưa nộp bài nào' : undefined}
        />
        <Stat icon="layers" label="Khóa học" value={String(data.courseCount)} />
      </View>

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
        {ordered.length > 0 && (
          <Card padded={false}>
            {ordered.slice(0, 5).map((c, i) => (
              <View key={c.courseId}>
                {i > 0 && <Divider />}
                <CourseRow course={c} />
              </View>
            ))}
          </Card>
        )}
      </View>

      <View>
        <SectionTitle
          title="Hoạt động gần đây"
          action={<Button label="Xem hết" variant="ghost" size="sm" onPress={() => router.navigate('/progress')} />}
        />
        {history.isLoading && <Skeleton height={160} />}
        {history.isError && <InlineError>{errorText(history.error, 'Không tải được hoạt động.')}</InlineError>}
        {history.data && history.data.items.length === 0 && (
          <Txt variant="small" tone="subtle">
            Chưa có lần làm bài nào. Kết quả bài tập sẽ hiện ở đây.
          </Txt>
        )}
        {history.data && history.data.items.length > 0 && (
          <Card padded={false}>
            {history.data.items.map((item, i) => (
              <View key={item.id}>
                {i > 0 && <Divider />}
                <Card
                  padded={false}
                  style={styles.activity}
                  onPress={() => router.push(routes.lesson(item.courseId, item.lessonId))}
                  accessibilityLabel={`${item.lessonTitle}, ${item.score} trên ${item.maxScore} điểm, ${item.passed ? 'đạt' : 'chưa đạt'}`}
                >
                  <Icon name={item.passed ? 'circle-check' : 'retry'} size={20} filled={item.passed} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="small" numberOfLines={1}>
                      {item.lessonTitle}
                    </Txt>
                    <Txt variant="caption" tone="subtle">
                      {item.score}/{item.maxScore} điểm · {item.passed ? 'đạt' : 'chưa đạt'} ·{' '}
                      {relativeTime(item.createdAt)}
                    </Txt>
                  </View>
                </Card>
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

/** App cũ hơn bản tối thiểu máy chủ còn hỗ trợ (`GET /meta`). */
function UpdateNotice() {
  return (
    <Notice icon="alert">
      <Txt variant="smallStrong">Có phiên bản mới của ứng dụng</Txt>
      <Txt variant="small" tone="muted">
        Bản đang dùng đã cũ so với máy chủ, một số màn có thể lỗi. Hãy cập nhật ứng dụng.
      </Txt>
    </Notice>
  );
}

function Stat({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  const p = usePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}
      style={[styles.stat, { backgroundColor: p.panel, borderColor: p.line }]}
    >
      <View style={styles.statHead}>
        <Icon name={icon} size={16} color={p.fgSubtle} />
        <Txt variant="caption" tone="subtle">
          {label}
        </Txt>
      </View>
      <Txt variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      {sub && (
        <Txt variant="caption" tone="subtle">
          {sub}
        </Txt>
      )}
    </View>
  );
}

/**
 * Thẻ "Học tiếp" — bài kế tiếp = bài đang học dở, không có thì bài chưa bắt đầu đầu tiên. Khi
 * danh sách bài chưa tải xong, nút vẫn dẫn tới trang khóa — không bao giờ là nút chết. Khác web:
 * nền panel + nút xám đậm, không khối đen đặc (ADR 001 của app).
 */
function ResumeCard({ course }: { course: ProgressCourse }) {
  const p = usePalette();
  const lessons = useLessons(course.courseId);
  const list = lessons.data?.lessons ?? [];
  const lesson =
    list.find((l) => l.progressStatus === 'IN_PROGRESS') ?? list.find((l) => l.progressStatus === 'NOT_STARTED');
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

function CourseRow({ course }: { course: ProgressCourse }) {
  return (
    <Card
      padded={false}
      style={styles.courseRow}
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
        <View style={styles.rowHead}>
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
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 0,
    borderRadius: 0,
  },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 0,
    borderRadius: 0,
  },
});
