import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  HistoryPage,
  LessonRead,
  LessonSource,
  LessonSummary,
  PatchLessonInput,
  ProgressCourse,
  ProgressOverview,
} from '@/contracts';
import { apiFetch } from '@/lib/api-client';
import { queueOrSend } from '@/lib/offline/outbox';

/** Cùng endpoint và query key với `apps/web/src/features/learning/learning-api.ts`. */
export function useLessons(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'lessons'],
    queryFn: () => apiFetch<{ lessons: LessonSummary[] }>(`/api/v1/courses/${courseId}/lessons`),
    enabled: Boolean(courseId),
  });
}

export function useLesson(courseId: string, lessonId: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'lessons', lessonId],
    queryFn: () => apiFetch<LessonRead>(`/api/v1/courses/${courseId}/lessons/${lessonId}`),
    enabled: Boolean(courseId && lessonId),
  });
}

/** Đoạn tài liệu gốc — chỉ tải khi người học mở khối "Nguồn". */
export function useLessonSources(courseId: string, lessonId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['courses', courseId, 'lessons', lessonId, 'sources'],
    queryFn: () =>
      apiFetch<{ sources: LessonSource[] }>(`/api/v1/courses/${courseId}/lessons/${lessonId}/sources`),
    enabled: enabled && Boolean(courseId && lessonId),
    staleTime: 5 * 60_000,
  });
}

export function useStartLesson(courseId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const path = `/api/v1/courses/${courseId}/lessons/${lessonId}/start`;
      return queueOrSend({ method: 'POST', path }, () => apiFetch(path, { method: 'POST' }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] });
    },
  });
}

/** Sửa nội dung Lesson — user story C-01. */
export function usePatchLesson(courseId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchLessonInput) =>
      apiFetch<LessonRead>(`/api/v1/courses/${courseId}/lessons/${lessonId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['courses', courseId, 'lessons', lessonId], data);
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] });
    },
  });
}

/** Sắp xếp lại thứ tự Lesson — user story C-02. */
export function useReorderLessons(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonIds: string[]) =>
      apiFetch<{ lessons: LessonSummary[] }>(`/api/v1/courses/${courseId}/lessons/reorder`, {
        method: 'PATCH',
        body: { lessonIds },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['courses', courseId, 'lessons'], data);
    },
  });
}

export function useDeleteLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiFetch(`/api/v1/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useProgressOverview() {
  return useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: () => apiFetch<ProgressOverview>('/api/v1/progress/overview'),
  });
}

export function useProgressCourses() {
  return useQuery({
    queryKey: ['progress', 'courses'],
    queryFn: () => apiFetch<{ courses: ProgressCourse[] }>('/api/v1/progress/courses'),
  });
}

export function useProgressHistory(limit: number) {
  return useQuery({
    queryKey: ['progress', 'history', 'first', limit],
    queryFn: () => apiFetch<HistoryPage>(`/api/v1/progress/history?limit=${limit}`),
  });
}

/** Lịch sử phân trang cursor (FR-PROGRESS-06) — "Xem thêm" nối trang kế. */
export function useProgressHistoryPages(pageSize: number) {
  return useInfiniteQuery({
    queryKey: ['progress', 'history', 'pages', pageSize],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      apiFetch<HistoryPage>(
        `/api/v1/progress/history?limit=${pageSize}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
