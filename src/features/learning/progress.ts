import type { LessonSummary, ProgressCourse } from '@/contracts';

/** Khóa đang dở, gần xong nhất trước — đẩy người học về đích; rồi tới khóa chưa bắt đầu. */
function rank(c: ProgressCourse) {
  if (c.percent > 0 && c.percent < 100) return 0;
  if (c.percent === 0) return 1;
  return 2;
}

export function orderCourses(courses: ProgressCourse[]): ProgressCourse[] {
  return [...courses].sort((a, b) => rank(a) - rank(b) || b.percent - a.percent);
}

/** Bài kế tiếp để học: bài đang học dở, không có thì bài chưa bắt đầu đầu tiên. */
export function resumeLesson<T extends Pick<LessonSummary, 'progressStatus'>>(lessons: T[]): T | undefined {
  return (
    lessons.find((l) => l.progressStatus === 'IN_PROGRESS') ??
    lessons.find((l) => l.progressStatus === 'NOT_STARTED')
  );
}
