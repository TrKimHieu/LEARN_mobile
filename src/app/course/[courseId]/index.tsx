import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, ErrorState, Icon, InlineError, Screen, SectionTitle, Skeleton, Txt } from '@/components/ui';
import { AiJobProgress } from '@/features/ai/components/ai-job-progress';
import { GenerateLessonsCard } from '@/features/ai/components/generate-lessons-card';
import { useCourse, useCourseDocuments, useDeleteCourse } from '@/features/courses/courses-api';
import { CourseHeader } from '@/features/courses/components/course-header';
import { DocumentList } from '@/features/documents/components/document-list';
import { DocumentUpload } from '@/features/documents/components/document-upload';
import { CourseLessons } from '@/features/learning/components/course-lessons';
import { useLessons } from '@/features/learning/learning-api';
import { resumeLesson } from '@/features/learning/progress';
import { errorDetail, errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { space } from '@/theme/tokens';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const course = useCourse(courseId);
  const documents = useCourseDocuments(courseId);
  const lessons = useLessons(courseId);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState<boolean | null>(null);

  const docList = documents.data?.documents;
  const docsShown = docsOpen ?? docList?.length === 0;
  const hasExtractedDoc = Boolean(docList?.some((d) => d.status === 'EXTRACTED'));
  const lessonList = lessons.data?.lessons ?? [];
  const completedCount = lessonList.filter((l) => l.progressStatus === 'COMPLETED').length;

  const refetchLessons = lessons.refetch;
  const handleJobDone = useCallback(
    (result: { succeeded: boolean }) => {
      setActiveJobId(null);
      if (result.succeeded) void refetchLessons();
    },
    [refetchLessons],
  );

  const refresh = () => Promise.all([course.refetch(), documents.refetch(), lessons.refetch()]);

  const deleteCourse = useDeleteCourse(courseId);
  const onDeleteCourse = async () => {
    const ok = await confirmAction({
      title: 'Xoá khóa học này?',
      message: 'Bài học, bài tập và tài liệu của khóa sẽ bị xoá. Không hoàn tác được.',
      confirmLabel: 'Xoá khóa học',
    });
    if (ok) deleteCourse.mutate(undefined, { onSuccess: () => router.back() });
  };

  if (course.isLoading) {
    return (
      <Screen>
        <View accessible accessibilityLabel="Đang tải khóa học" style={{ gap: space.lg }}>
          <Skeleton height={140} />
          <Skeleton height={36} width="70%" />
          <Skeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (course.isError || !course.data) {
    return (
      <Screen onRefresh={refresh}>
        <ErrorState
          title="Không tải được khóa học"
          description={errorText(course.error, 'Vui lòng thử lại sau ít phút.')}
          detail={errorDetail(course.error)}
          onRetry={() => void course.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: course.data.title }} />

      <CourseHeader
        course={course.data}
        lessonCount={lessonList.length}
        completedCount={completedCount}
        documentCount={docList?.length ?? 0}
        // Đang học dở → chưa bắt đầu đầu tiên → bài đầu (xem lại).
        resume={resumeLesson(lessonList) ?? lessonList[0]}
      />

      {/* Học là việc chính (spec web 4.6): danh sách bài trước, việc quản lý sau. */}
      <View>
        <SectionTitle title="Lộ trình bài học" description="Chạm vào một bài để học. Mũi tên đổi thứ tự." />
        {activeJobId ? (
          <AiJobProgress jobId={activeJobId} onDone={handleJobDone} />
        ) : (
          <CourseLessons courseId={courseId} hasExtractedDoc={hasExtractedDoc} />
        )}
      </View>

      <GenerateLessonsCard
        courseId={courseId}
        hasExtractedDoc={hasExtractedDoc}
        documentsLoading={documents.isLoading}
        busy={activeJobId !== null}
        onStarted={setActiveJobId}
      />

      <View>
        {/* Gập sẵn; khóa chưa có tài liệu nào thì mở sẵn để thêm tài liệu đầu tiên. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: docsShown }}
          onPress={() => setDocsOpen(!docsShown)}
          style={styles.docsHead}
        >
          <Txt variant="heading">{`Tài liệu (${docList?.length ?? 0})`}</Txt>
          <Icon name={docsShown ? 'chevron-up' : 'chevron-down'} size={20} />
        </Pressable>
        {docsShown && (
          <View style={{ gap: space.md }}>
            <DocumentUpload courseId={courseId} />
            <DocumentList
              documents={docList}
              isLoading={documents.isLoading}
              error={documents.isError ? documents.error : null}
              onRetry={() => void documents.refetch()}
            />
          </View>
        )}
      </View>

      <Button
        label="Xoá khóa học"
        variant="danger"
        icon="trash"
        loading={deleteCourse.isPending}
        onPress={() => void onDeleteCourse()}
        style={{ alignSelf: 'flex-start' }}
      />
      {deleteCourse.error && <InlineError>{errorText(deleteCourse.error, 'Không xoá được khóa học, vui lòng thử lại.')}</InlineError>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  docsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: space.sm },
});
