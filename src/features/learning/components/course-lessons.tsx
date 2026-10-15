import { useState } from 'react';
import { EmptyState, ErrorState, InlineError, LoadingState } from '@/components/ui';
import { errorText } from '@/lib/api-client';
import { space } from '@/theme/tokens';
import { useLessons, useReorderLessons } from '../learning-api';
import { LessonPath } from './lesson-path';

/** Lộ trình bài học của khóa, kèm đổi thứ tự bằng mũi tên. */
export function CourseLessons({ courseId, hasExtractedDoc }: { courseId: string; hasExtractedDoc: boolean }) {
  const lessons = useLessons(courseId);
  const reorder = useReorderLessons(courseId);
  const [reorderError, setReorderError] = useState<unknown>(null);
  const list = lessons.data?.lessons ?? [];

  async function moveLesson(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);
    setReorderError(null);
    try {
      await reorder.mutateAsync(reordered.map((l) => l.id));
    } catch (err) {
      setReorderError(err);
    }
  }

  return (
    <>
      {Boolean(reorderError) && (
        <InlineError style={{ marginBottom: space.md }}>
          {errorText(reorderError, 'Không sắp xếp lại được, vui lòng thử lại.')}
        </InlineError>
      )}
      {lessons.isLoading && <LoadingState rows={3} height={64} label="Đang tải bài học" />}
      {lessons.isError && (
        <ErrorState
          title="Không tải được bài học"
          description={errorText(lessons.error, 'Vui lòng thử lại.')}
          onRetry={() => void lessons.refetch()}
        />
      )}
      {lessons.data && list.length === 0 && (
        <EmptyState
          title="Chưa có bài học nào"
          description={
            hasExtractedDoc
              ? 'Tài liệu đã sẵn sàng. Chạm "Sinh bài học" để tạo lộ trình.'
              : 'Tải tài liệu lên ở phần bên dưới, rồi chạm "Sinh bài học" để tạo lộ trình.'
          }
        />
      )}
      {list.length > 0 && (
        <LessonPath
          lessons={list}
          courseId={courseId}
          onMove={(i, d) => void moveLesson(i, d)}
          reordering={reorder.isPending}
        />
      )}
    </>
  );
}
