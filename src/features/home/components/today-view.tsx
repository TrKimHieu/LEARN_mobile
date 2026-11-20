import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Mascot } from '@/components/mascot';
import {
  Button, Card, Divider, EmptyState, ErrorState, Icon, IconButton, ProgressRing, Screen, Skeleton, Txt, type IconName,
} from '@/components/ui';
import { UpdateNotice } from '@/components/update-notice';
import { syncStudyReminder } from '@/features/reviews/reminder';
import { errorText } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { moodFor } from '../mood';
import { isDone, taskHref, type TodayTask } from '../today-plan';
import { useTodayPlan } from '../use-today-plan';

/** Màn Học (spec web 4.2): mở ra là biết hôm nay học gì, bắt đầu bằng một lần chạm. */
export function TodayView() {
  const t = useTodayPlan();
  const p = usePalette();
  // T4-4: nhắc học 19:00 theo việc hôm nay còn dở; xong hết thì huỷ nhắc.
  const remaining = t.plan
    ? t.plan.tasks.filter((task) => !isDone(t.plan!, task, t.liveDue)).map(reminderLabel)
    : null;
  // Khoá chuỗi để effect chỉ chạy khi danh sách việc còn dở thật sự đổi.
  const remainingKey = remaining ? JSON.stringify(remaining) : null;
  // T4-5: có chuỗi mà hôm nay chưa có ngày học (ngày học theo server, xem T4-1) thì nhắc giữ chuỗi.
  const lastStudyDay = t.overview.data?.lastStudyDay ?? null;
  const activeStreak = t.overview.data?.activeStreak ?? 0;
  const streakAtRisk = activeStreak > 0 && (lastStudyDay === null || lastStudyDay < t.day) ? activeStreak : 0;
  useEffect(() => {
    if (remainingKey !== null) void syncStudyReminder(JSON.parse(remainingKey) as string[], new Date(), streakAtRisk);
  }, [remainingKey, streakAtRisk]);
  const refresh = async () => {
    await Promise.all([t.overview.refetch()]);
    t.retry();
  };

  const header = (
    <View style={styles.header}>
      <Txt variant="display">Học</Txt>
      <IconButton icon="user" label="Cài đặt và tài khoản" onPress={() => router.push(routes.settings)} size={44} />
    </View>
  );

  if (t.gate === 'error' && !t.plan) {
    return (
      <Screen topInset>
        {header}
        <ErrorState title="Không tải được việc hôm nay" description={errorText(t.failed?.error, 'Vui lòng thử lại.')} onRetry={t.retry} />
      </Screen>
    );
  }
  if (!t.plan) {
    return (
      <Screen topInset>
        {header}
        <View accessible accessibilityLabel="Đang tải việc hôm nay" style={{ gap: space.lg }}>
          <Skeleton height={120} />
          <Skeleton height={180} />
        </View>
      </Screen>
    );
  }

  const plan = t.plan;
  const total = plan.tasks.length;
  const doneCount = plan.tasks.filter((task) => isDone(plan, task, t.liveDue)).length;
  const streak = t.overview.data?.activeStreak ?? 0;
  const mood = moodFor({
    today: t.day,
    lastStudyDay: t.overview.data?.lastStudyDay ?? null,
    previousSeenStudyDay: t.previousSeen,
    allDone: total > 0 && doneCount === total,
    activeStreak: streak,
  });

  if (!t.hasCourses) {
    return (
      <Screen topInset onRefresh={refresh}>
        {header}
        <UpdateNotice />
        <EmptyState
          title="Chưa có khóa học nào"
          description="Tạo khóa học đầu tiên và tải tài liệu lên. AI sẽ sinh bài học và bài tập từ chính nội dung đó."
          action={{ label: 'Tạo khóa học đầu tiên', onPress: () => router.push(routes.newCourse) }}
        />
      </Screen>
    );
  }

  return (
    <Screen topInset onRefresh={refresh}>
      {header}
      <UpdateNotice />
      <View style={styles.hero}>
        <Mascot state={mood} size={88} />
        <View style={{ flex: 1, gap: space.xs }}>
          <View style={styles.streak} accessible accessibilityLabel={`Chuỗi ${streak} ngày học`}>
            <Icon name="flame" size={20} color={streak > 0 ? p.primary : p.fgSubtle} />
            <Txt variant="title">{streak}</Txt>
            <Txt variant="small" tone="subtle">ngày</Txt>
          </View>
          <Txt variant="small" tone="subtle">{`Đã xong ${doneCount} trên ${total} việc hôm nay`}</Txt>
        </View>
        {total > 0 && (
          <ProgressRing value={doneCount} max={total} size={64} label={`Mục tiêu hôm nay: ${doneCount} trên ${total} việc`}>
            <Txt variant="smallStrong">{`${doneCount}/${total}`}</Txt>
          </ProgressRing>
        )}
      </View>

      <Txt variant="heading">Hôm nay</Txt>
      {total === 0 ? (
        <Txt variant="small" tone="subtle">Hôm nay không còn việc nào.</Txt>
      ) : (
        <Card padded={false}>
          {plan.tasks.map((task, i) => (
            <View key={task.id}>
              {i > 0 && <Divider />}
              <TaskRow task={task} done={isDone(plan, task, t.liveDue)} questionsDue={t.questionsDue} />
            </View>
          ))}
        </Card>
      )}

      <View style={styles.links}>
        <Button label="Pomodoro" variant="ghost" size="sm" icon="clock" onPress={() => router.push(routes.focus())} />
        <Button
          label={`Khóa học đang học${t.studying > 0 ? ` (${t.studying})` : ''}`}
          variant="ghost"
          size="sm"
          icon="layers"
          onPress={() => router.navigate('/(tabs)/courses')}
        />
      </View>
    </Screen>
  );
}

/** Một dòng trong thông báo nhắc học. */
function reminderLabel(task: TodayTask): string {
  switch (task.kind) {
    case 'review':
      return `${task.dueCount} thẻ đến hạn`;
    case 'lesson':
      return `Bài: ${task.title}`;
    case 'exercise':
      return `Luyện lại: ${task.lessonTitle}`;
  }
}

function taskView(task: TodayTask): { icon: IconName; title: string; sub: string | null; action: string } {
  switch (task.kind) {
    case 'review':
      return { icon: 'layers', title: `Ôn ${task.dueCount} thẻ đến hạn`, sub: null, action: 'Ôn' };
    case 'lesson':
      return { icon: 'book-check', title: task.title, sub: `${task.courseTitle} · Bài ${task.index}/${task.total}`, action: 'Học' };
    case 'exercise':
      return { icon: 'retry', title: `Luyện lại: ${task.lessonTitle}`, sub: `Lần trước ${task.score} điểm`, action: 'Làm lại' };
  }
}

function TaskRow({ task, done, questionsDue }: { task: TodayTask; done: boolean; questionsDue: number }) {
  const p = usePalette();
  const v = taskView(task);
  const open = () => router.push(taskHref(task, questionsDue));
  // Như web: chỉ nút hành động bắt chạm (lồng nút trong vùng chạm là lỗi trên web và gây đọc trùng).
  return (
    <View style={styles.row}>
      <Icon name={done ? 'circle-check' : v.icon} size={22} color={done ? p.primary : p.fgMuted} />
      <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${v.title}${v.sub ? `, ${v.sub}` : ''}${done ? ', đã xong' : ''}`}>
        <Txt variant="smallStrong" numberOfLines={2} tone={done ? 'subtle' : 'fg'}>{v.title}</Txt>
        {v.sub && <Txt variant="caption" tone="subtle" numberOfLines={1}>{v.sub}</Txt>}
      </View>
      {!done && (
        <Button
          label={v.action}
          accessibilityLabel={`${v.action}: ${v.title}`}
          size="sm"
          variant={task.kind === 'exercise' ? 'secondary' : 'primary'}
          onPress={open}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  streak: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 64 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
