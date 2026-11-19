import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import type { SubmissionResult } from '@/contracts';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import type { AnswerState } from '@/features/exercises/answers';
import { ExerciseSession } from '@/features/exercises/components/exercise-session';
import { OfflineNotice, QuickSession, type QuickSummary } from '@/features/exercises/components/quick-session';
import { ResultView } from '@/features/exercises/components/result-view';
import { useExercise } from '@/features/exercises/exercises-api';
import { useLessons } from '@/features/learning/learning-api';
import { errorDetail, errorText, isNotFound } from '@/lib/api-client';
import { useIsOnline } from '@/lib/offline/network';
import { routes } from '@/lib/routes';

export default function PracticeScreen() {
  const { courseId, lessonId, exercise: exerciseParam } = useLocalSearchParams<{
    courseId: string;
    lessonId: string;
    exercise?: string;
  }>();
  const exercise = useExercise(lessonId, exerciseParam ?? '');
  const lessons = useLessons(courseId);
  // Bài tập đang mở nằm trong params: deep link hay quay lại vẫn đúng bài tập.
  const openExercise = (id: string) => router.setParams({ exercise: id });
  const online = useIsOnline();
  // Mặc định chấm từng câu (spec web 4.4); "Làm kiểu kiểm tra" giữ giao diện làm hết rồi nộp.
  const [mode, setMode] = useState<'quick' | 'exam' | null>(null);
  const [run, setRun] = useState(0);
  const [quick, setQuick] = useState<{
    exerciseId: string;
    result: SubmissionResult | undefined;
    answers: AnswerState;
    summary: QuickSummary;
  } | null>(null);

  const list = lessons.data?.lessons ?? [];
  const lessonIndex = list.findIndex((l) => l.id === lessonId);
  const next = lessonIndex >= 0 ? list[lessonIndex + 1] : undefined;
  const nextLesson = next && {
    title: next.title,
    open: () => {
      // Thay cả cặp bài học + bài tập: Back từ bài mới về khóa học, không về bài tập cũ.
      router.dismiss(2);
      router.push(routes.lesson(courseId, next.id));
    },
  };

  if (exercise.isLoading) {
    return (
      <Screen width="reading">
        <LoadingState rows={4} height={120} label="Đang tải bài tập" />
      </Screen>
    );
  }

  if (exercise.isError) {
    return (
      <Screen width="reading">
        {isNotFound(exercise.error) && exerciseParam ? (
          <EmptyState
            title="Không tìm thấy bài tập này"
            description="Đường dẫn có thể đã cũ. Mở bài tập đầu tiên của bài học để làm tiếp."
            action={{ label: 'Mở bài tập đầu tiên', onPress: () => router.setParams({ exercise: '' }) }}
          />
        ) : isNotFound(exercise.error) ? (
          <EmptyState
            title="Bài học này chưa có bài tập"
            description="Sinh bài học bằng AI sẽ tạo kèm bài tập cho từng bài."
          />
        ) : (
          <ErrorState
            title="Không tải được bài tập"
            description={errorText(exercise.error, 'Vui lòng thử lại.')}
            detail={errorDetail(exercise.error)}
            onRetry={() => void exercise.refetch()}
          />
        )}
      </Screen>
    );
  }

  if (!exercise.data) return null;
  const data = exercise.data;

  // Phiên chấm từng câu xong: màn kết quả chung, "Làm lại" mở một phiên chấm từng câu mới.
  if (quick?.exerciseId === data.id) {
    if (!quick.result) {
      return (
        <Screen width="reading">
          <EmptyState
            title="Đã lưu bài làm"
            description="Bài nộp sẽ gửi khi có mạng; điểm hiện sau đó."
            action={{ label: 'Về bài học', onPress: () => router.back() }}
          />
        </Screen>
      );
    }
    return (
      <ResultView
        data={data}
        result={quick.result}
        answers={quick.answers}
        nextLesson={nextLesson}
        summary={summaryText(quick.summary)}
        onRetry={() => {
          setQuick(null);
          setRun((n) => n + 1);
        }}
        onOpenExercise={(id) => {
          setQuick(null);
          openExercise(id);
        }}
      />
    );
  }

  const examMode = () => setMode('exam');
  if ((mode ?? (online ? 'quick' : 'exam')) === 'quick') {
    if (!online) {
      return (
        <Screen width="reading">
          <OfflineNotice onExamMode={examMode} />
        </Screen>
      );
    }
    return (
      <QuickSession
        key={`${data.id}:${run}`}
        courseId={courseId}
        lessonId={lessonId}
        data={data}
        onExamMode={examMode}
        onFinished={(result, answers, summary) => setQuick({ exerciseId: data.id, result, answers, summary })}
      />
    );
  }

  // `key`: đổi bài tập là một phiên làm bài mới, câu trả lời của bài trước không sót lại.
  return (
    <ExerciseSession
      key={data.id}
      courseId={courseId}
      lessonId={lessonId}
      data={data}
      nextLesson={nextLesson}
      onOpenExercise={openExercise}
    />
  );
}

function summaryText(s: QuickSummary): string {
  const minutes = Math.max(1, Math.round(s.durationMs / 60_000));
  return `Chuỗi đúng dài nhất ${s.bestStreak} · ${minutes} phút`;
}
