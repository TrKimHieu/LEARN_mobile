import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ProgressCourse } from '@/contracts';
import { useDueCardCount } from '@/features/flashcards/flashcards-api';
import { useLessons, useProgressCourses, useProgressHistory, useProgressOverview } from '@/features/learning/learning-api';
import { useOffline } from '@/features/offline/offline-provider';
import { useDueReviews } from '@/features/reviews/reviews-api';
import { MOOD_KEY, readToday, setTodayListener, TODAY_KEY, todayKey, writeToday } from '@/lib/today-store';
import { seenStudyDayToKeep } from './mood';
import {
  buildTasks, parsePlan, pickNextLesson, planGate, rankCourse, reconcile, retriedToday,
  type SavedPlan, type TodayInputs,
} from './today-plan';

/** Lịch sử đủ dài để thấy bài chưa đạt mới nhất và lần đạt sau đó (nếu có). */
const HISTORY_LIMIT = 20;

/** Bài kế tiếp của hai khóa chưa xong, khóa gần xong nhất trước. Luôn gọi `useLessons` hai lần. */
function useNextLessons(courses: ProgressCourse[]) {
  const open = courses
    .filter((c) => c.percent < 100)
    .sort((a, b) => rankCourse(a) - rankCourse(b) || b.percent - a.percent);
  const first = useLessons(open[0]?.courseId ?? '');
  const second = useLessons(open[1]?.courseId ?? '');
  const lessons: TodayInputs['nextLessons'] = [];
  [first, second].forEach((q, i) => {
    const course = open[i];
    const list = q.data?.lessons ?? [];
    const next = course && pickNextLesson(list);
    if (!course || !next) return;
    lessons.push({
      courseId: course.courseId, lessonId: next.lesson.id, title: next.lesson.title,
      courseTitle: course.courseTitle, index: next.index + 1, total: list.length,
    });
  });
  // Query tắt (khóa thiếu) không được tính là đang tải.
  const queries = [first, second].filter((_, i) => open[i]);
  return { lessons, queries, studying: courses.filter((c) => c.percent > 0 && c.percent < 100).length };
}

/** Ngày theo giờ máy; kiểm lại khi app quay về foreground để danh sách đổi khi qua ngày. */
function useToday() {
  const client = useQueryClient();
  const [day, setDay] = useState(() => todayKey());
  const dayRef = useRef(day);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const now = todayKey();
      if (s !== 'active' || now === dayRef.current) return;
      dayRef.current = now;
      // Làm tươi trước khi đổi ngày, để danh sách mới không dựng từ số liệu hôm qua.
      void client.invalidateQueries({ queryKey: ['progress'] });
      void client.invalidateQueries({ queryKey: ['reviews', 'due'] });
      void client.invalidateQueries({ queryKey: ['decks', 'due-count'] });
      setDay(now);
    });
    return () => sub.remove();
  }, [client]);
  return day;
}

/** "Việc hôm nay" (spec web 4.2) cho màn Học. Ôn câu hỏi và ôn thẻ gộp thành một việc "Ôn". */
export function useTodayPlan() {
  const { kv } = useOffline();
  const day = useToday();
  const overview = useProgressOverview();
  const courses = useProgressCourses();
  const questions = useDueReviews();
  const cards = useDueCardCount();
  const history = useProgressHistory(HISTORY_LIMIT);
  const next = useNextLessons(courses.data?.courses ?? []);
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [previousSeen, setPreviousSeen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const questionsDue = questions.data?.dueCount ?? 0;
  // Backend chưa có route thẻ tự tạo thì đếm thẻ lỗi: không chặn cả màn, chỉ tính câu hỏi.
  const cardsDue = cards.data ?? 0;
  const dueCount = questionsDue + cardsDue;

  const sources = [overview, courses, questions, history, ...next.queries];
  const gate = planGate(sources);
  const ready = gate === 'ready';
  const failed = sources.find((q) => q.isLoadingError);

  useEffect(() => {
    setTodayListener(() => setVersion((v) => v + 1));
    return () => setTodayListener(null);
  }, []);

  // Danh sách chốt lần đầu trong ngày; các lần sau đọc lại bản đã lưu (kể cả việc đã xong ở màn khác).
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    void (async () => {
      const saved = parsePlan(await readToday(kv, TODAY_KEY));
      const items = history.data?.items ?? [];
      const fresh = buildTasks({ dueCount, nextLessons: next.lessons, history: items });
      const current = reconcile(saved, fresh, day, retriedToday(items, day));
      if (current !== saved) await writeToday(kv, TODAY_KEY, JSON.stringify(current));
      if (alive) setPlan(current);
    })();
    return () => { alive = false; };
    // Chạy khi dữ liệu vừa đủ, khi qua ngày, khi mở DB tài khoản, hoặc khi màn khác đánh dấu xong.
    // Cố ý không theo dõi số liệu: trong ngày danh sách đã chốt, số liệu đổi không được dựng lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, day, kv, version]);

  const lastStudyDay = overview.data?.lastStudyDay ?? null;
  useEffect(() => {
    if (!overview.data) return;
    void (async () => {
      setPreviousSeen(await readToday(kv, MOOD_KEY));
      const keep = seenStudyDayToKeep(lastStudyDay, day);
      if (keep) await writeToday(kv, MOOD_KEY, keep);
    })();
  }, [overview.data, lastStudyDay, day, kv]);

  return {
    gate,
    failed,
    retry: () => sources.forEach((q) => q.isLoadingError && void q.refetch()),
    plan,
    day,
    overview,
    /** Lỗi đếm thì không tự đánh dấu xong việc ôn. */
    liveDue: questions.data ? dueCount : 1,
    questionsDue,
    previousSeen,
    studying: next.studying,
    hasCourses: (courses.data?.courses.length ?? 0) > 0,
  };
}
