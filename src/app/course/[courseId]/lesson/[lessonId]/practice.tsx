import { router, useLocalSearchParams } from 'expo-router';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { ExerciseSession } from '@/features/exercises/components/exercise-session';
import { useExercise } from '@/features/exercises/exercises-api';
import { useLessons } from '@/features/learning/learning-api';
import { errorDetail, errorText, isNotFound } from '@/lib/api-client';
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

  // `key`: đổi bài tập là một phiên làm bài mới, câu trả lời của bài trước không sót lại.
  return (
    <ExerciseSession
      key={exercise.data.id}
      courseId={courseId}
      lessonId={lessonId}
      data={exercise.data}
      nextLesson={nextLesson}
      onOpenExercise={openExercise}
    />
  );
}
