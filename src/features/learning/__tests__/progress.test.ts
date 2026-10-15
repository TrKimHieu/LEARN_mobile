import type { ProgressCourse } from '@/contracts';
import { orderCourses, resumeLesson } from '../progress';

const course = (courseId: string, percent: number) => ({ courseId, percent }) as ProgressCourse;

describe('orderCourses', () => {
  it('khóa đang dở (gần xong trước) → chưa bắt đầu → đã xong', () => {
    const ordered = orderCourses([course('xong', 100), course('moi', 0), course('it', 20), course('nhieu', 80)]);
    expect(ordered.map((c) => c.courseId)).toEqual(['nhieu', 'it', 'moi', 'xong']);
  });

  it('không đổi mảng gốc', () => {
    const input = [course('a', 0), course('b', 50)];
    orderCourses(input);
    expect(input.map((c) => c.courseId)).toEqual(['a', 'b']);
  });
});

describe('resumeLesson', () => {
  const lesson = (id: string, progressStatus: string) => ({ id, progressStatus }) as never as {
    id: string;
    progressStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  };

  it('ưu tiên bài đang học dở', () => {
    const list = [lesson('1', 'COMPLETED'), lesson('2', 'NOT_STARTED'), lesson('3', 'IN_PROGRESS')];
    expect(resumeLesson(list)?.id).toBe('3');
  });

  it('không có bài dở → bài chưa bắt đầu đầu tiên', () => {
    expect(resumeLesson([lesson('1', 'COMPLETED'), lesson('2', 'NOT_STARTED')])?.id).toBe('2');
  });

  it('đã xong hết → không có', () => {
    expect(resumeLesson([lesson('1', 'COMPLETED')])).toBeUndefined();
  });
});
