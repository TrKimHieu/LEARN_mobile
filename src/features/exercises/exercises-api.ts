import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckAnswerInput, CheckResult, ExerciseRead, SubmissionResult, SubmitExerciseInput } from '@/contracts';
import { randomUUID } from 'expo-crypto';
import { apiFetch } from '@/lib/api-client';
import { queueOrSend } from '@/lib/offline/outbox';

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

/** `sessionKey`: phiên chấm từng câu dùng một key cho cả phiên, nên bấm "Thử lại" sau lỗi nộp không lưu thêm lượt. */
export function useSubmitExercise(courseId: string, lessonId: string, sessionKey?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    /**
     * Mỗi lượt bấm "Nộp bài" một key. Mất mạng thì lượt nộp vào hàng chờ với đúng key đó, nên nếu
     * lần đầu thật ra đã tới server, lần gửi lại chỉ nhận lại kết quả cũ. `undefined` = đã xếp hàng.
     */
    mutationFn: (input: SubmitExerciseInput): Promise<SubmissionResult | undefined> => {
      const path = `/api/v1/lessons/${lessonId}/exercise/submit`;
      const key = sessionKey ?? randomUUID();
      return queueOrSend({ method: 'POST', path, body: input, eventId: key }, () =>
        apiFetch<SubmissionResult>(path, { method: 'POST', body: input, headers: { 'Idempotency-Key': key } }),
      );
    },
    onSuccess: (result) => {
      if (!result) return;
      void queryClient.invalidateQueries({ queryKey: ['lessons', lessonId, 'exercise'] });
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Chấm một câu, không lưu gì (spec web 4.4, contracts 1.8.0). Cần mạng: không xếp hàng offline, vì kết
 * quả phải có ngay; mất mạng thì phiên luyện tập chuyển sang chế độ "kiểu kiểm tra".
 */
export function useCheckAnswer(lessonId: string) {
  return useMutation({
    mutationFn: (input: CheckAnswerInput) =>
      apiFetch<CheckResult>(`/api/v1/lessons/${encodeURIComponent(lessonId)}/exercise/check`, { method: 'POST', body: input }),
  });
}
