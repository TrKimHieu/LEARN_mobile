import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CourseCover } from '@/components/course-cover';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  ProgressRing,
  Screen,
  SectionTitle,
  Skeleton,
  Txt,
} from '@/components/ui';
import { useProgressCourses, useProgressHistoryPages } from '@/features/learning/learning-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { radius, space } from '@/theme/tokens';

const PAGE_SIZE = 10;

export default function ProgressScreen() {
  const courses = useProgressCourses();
  const history = useProgressHistoryPages(PAGE_SIZE);
  const items = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen topInset onRefresh={() => Promise.all([courses.refetch(), history.refetch()])}>
      <PageHeader title="Tiến trình" description="Tiến độ theo từng khóa học và lịch sử các lần làm bài tập." />

      <View>
        <SectionTitle title="Theo khóa học" />
        {courses.isLoading && <LoadingState rows={2} height={84} label="Đang tải tiến trình" />}
        {courses.isError && (
          <ErrorState
            title="Không tải được tiến trình"
            description={errorText(courses.error, 'Vui lòng thử lại.')}
            detail={errorDetail(courses.error)}
            onRetry={() => void courses.refetch()}
          />
        )}
        {courses.data && courses.data.courses.length === 0 && (
          <EmptyState
            title="Chưa có khóa học nào để theo dõi"
            description="Tiến trình sẽ xuất hiện ở đây khi bạn bắt đầu học một khóa."
          />
        )}
        {courses.data && courses.data.courses.length > 0 && (
          <View style={{ gap: space.md }}>
            {courses.data.courses.map((c) => (
              <Card
                key={c.courseId}
                style={styles.courseCard}
                onPress={() => router.push(routes.course(c.courseId))}
                accessibilityLabel={`${c.courseTitle}, ${c.completed} trên ${c.total} bài, ${c.percent} phần trăm`}
              >
                <CourseCover
                  id={c.courseId}
                  title={c.courseTitle}
                  style={{ width: 52, height: 52, borderRadius: radius.control }}
                  initialSize={22}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt variant="smallStrong" numberOfLines={2}>
                    {c.courseTitle}
                  </Txt>
                  <Txt variant="caption" tone="subtle">
                    {c.completed}/{c.total} bài đã hoàn thành
                  </Txt>
                  {c.percent === 100 && <Badge label="Hoàn tất" icon="check" />}
                </View>
                <ProgressRing value={c.completed} max={Math.max(c.total, 1)} label={`${c.percent}%`}>
                  <Txt variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                    {Math.round(c.percent)}%
                  </Txt>
                </ProgressRing>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionTitle title="Lịch sử làm bài" description="Chạm vào một lần làm bài để mở lại bài học đó." />
        {history.isLoading && <Skeleton height={240} />}
        {history.isError && (
          <ErrorState
            title="Không tải được lịch sử"
            description={errorText(history.error, 'Vui lòng thử lại.')}
            detail={errorDetail(history.error)}
            onRetry={() => void history.refetch()}
          />
        )}
        {history.data && items.length === 0 && (
          <EmptyState
            compact
            title="Chưa có lần làm bài nào"
            description="Làm bài tập ở cuối mỗi bài học, kết quả sẽ hiện ở đây."
          />
        )}
        {items.length > 0 && (
          <>
            <Card padded={false}>
              {items.map((item, i) => (
                <View key={item.id}>
                  {i > 0 && <Divider />}
                  <Card
                    padded={false}
                    style={styles.historyRow}
                    onPress={() => router.push(routes.lesson(item.courseId, item.lessonId))}
                    accessibilityLabel={`${item.lessonTitle}, ${item.score} trên ${item.maxScore} điểm, ${item.passed ? 'đạt' : 'chưa đạt'}`}
                  >
                    <Icon name={item.passed ? 'circle-check' : 'retry'} size={20} filled={item.passed} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="smallStrong" numberOfLines={1}>
                        {item.lessonTitle}
                      </Txt>
                      <Txt variant="caption" tone="subtle" numberOfLines={1}>
                        {item.courseTitle}
                        {item.exerciseTitle ? ` · ${item.exerciseTitle}` : ''} · {relativeTime(item.createdAt)}
                      </Txt>
                    </View>
                    {/* Ngưỡng đạt của từng bài tập do server tính — không tự suy từ phần trăm. */}
                    <Badge label={`${item.score}/${item.maxScore}`} tone={item.passed ? 'neutral' : 'outline'} />
                  </Card>
                </View>
              ))}
            </Card>
            {history.hasNextPage && (
              <Button
                label="Xem thêm"
                variant="secondary"
                loading={history.isFetchingNextPage}
                onPress={() => void history.fetchNextPage()}
                style={{ marginTop: space.lg, alignSelf: 'center' }}
              />
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 0,
    borderRadius: 0,
  },
});
