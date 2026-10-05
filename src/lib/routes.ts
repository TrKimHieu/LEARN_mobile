import type { Href } from 'expo-router';

/**
 * Đường dẫn trong app — một chỗ duy nhất. Params chỉ mang ID (bài giảng §4.4: màn đích tự đọc
 * dữ liệu mới nhất từ query cache/API, không truyền cả object qua route).
 */
export const routes = {
  newCourse: '/course/new' as Href,
  course: (courseId: string): Href => ({ pathname: '/course/[courseId]', params: { courseId } }),
  lesson: (courseId: string, lessonId: string): Href => ({
    pathname: '/course/[courseId]/lesson/[lessonId]',
    params: { courseId, lessonId },
  }),
  practice: (courseId: string, lessonId: string, exerciseId?: string): Href => ({
    pathname: '/course/[courseId]/lesson/[lessonId]/practice',
    params: exerciseId ? { courseId, lessonId, exercise: exerciseId } : { courseId, lessonId },
  }),
  editLesson: (courseId: string, lessonId: string): Href => ({
    pathname: '/course/[courseId]/lesson/[lessonId]/edit',
    params: { courseId, lessonId },
  }),
  adminAiJobs: '/admin/ai-jobs' as Href,
  adminAiJob: (jobId: string): Href => ({ pathname: '/admin/ai-jobs/[jobId]', params: { jobId } }),
};
