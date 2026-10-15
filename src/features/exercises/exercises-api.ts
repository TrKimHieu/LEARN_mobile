import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExerciseRead, SubmissionResult, SubmitExerciseInput } from '@/contracts';
import { apiFetch } from '@/lib/api-client';

/**
 * Cùng endpoint và query key với `useExercise`/`useSubmitExercise` trong
 * `apps/web/src/features/learning/learning-api.ts` — chỉ khác chỗ đặt file.
 */

/** `exerciseId` rỗng = bài tập đầu tiên của bài học. */
export function useExercise(lessonId: string, exerciseId = '') {
  return useQuery({
    queryKey: ['lessons', lessonId, 'exercise', exerciseId || 'first'],
    queryFn: () =>
      apiFetch<ExerciseRead>(
        `/api/v1/lessons/${lessonId}/exercise${exerciseId ? `?exerciseId=${encodeURIComponent(exerciseId)}` : ''}`,
      ),
    enabled: Boolean(lessonId),
    retry: false, // 404 hợp lệ khi lesson chưa có exercise
  });
}

export function useSubmitExercise(courseId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitExerciseInput) =>
      apiFetch<SubmissionResult>(`/api/v1/lessons/${lessonId}/exercise/submit`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lessons', lessonId, 'exercise'] });
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
