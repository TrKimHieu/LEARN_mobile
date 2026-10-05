import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DOCUMENT_TYPES, type DocumentList } from '@/contracts';
import { CourseCover } from '@/components/course-cover';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  InlineError,
  LoadingState,
  Notice,
  ProgressBar,
  QuotaNotice,
  Screen,
  SectionTitle,
  Segmented,
  Skeleton,
  Txt,
} from '@/components/ui';
import { AiJobProgress } from '@/features/ai/ai-job-progress';
import { useGenerateLessons } from '@/features/ai/ai-api';
import { useCourse, useCourseDocuments } from '@/features/courses/courses-api';
import { useUploadDocument } from '@/features/documents/documents-api';
import { LessonPath } from '@/features/learning/lesson-path';
import { useLessons, useReorderLessons } from '@/features/learning/learning-api';
import { errorDetail, errorText, isQuotaExceededError } from '@/lib/api-client';
import { formatSize, humanizeCode, relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const DOC_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ tải lên',
  UPLOADED: 'Đã tải lên',
  EXTRACTING: 'Đang trích xuất',
  EXTRACTED: 'Đã trích xuất',
  FAILED: 'Lỗi',
};

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'EASY', label: 'Dễ' },
  { value: 'MEDIUM', label: 'Vừa' },
  { value: 'HARD', label: 'Khó' },
];

/** MIME cho trình chọn tệp — thêm octet-stream vì Android hay khai .md/.docx như vậy; đuôi tệp mới quyết định. */
const PICKER_TYPES = [
  ...new Set([...DOCUMENT_TYPES.flatMap((t) => [t.mime, ...t.aliases]), 'application/octet-stream']),
];

export default function CourseDetailScreen() {
  const p = usePalette();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const course = useCourse(courseId);
  const documents = useCourseDocuments(courseId);
  const lessons = useLessons(courseId);
  const upload = useUploadDocument(courseId);
  const generate = useGenerateLessons(courseId);
  const reorder = useReorderLessons(courseId);

  const [uploadError, setUploadError] = useState<unknown>(null);
  const [generateError, setGenerateError] = useState<unknown>(null);
  const [reorderError, setReorderError] = useState<unknown>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');

  const hasExtractedDoc = Boolean(documents.data?.documents.some((d) => d.status === 'EXTRACTED'));
  const lessonList = lessons.data?.lessons ?? [];
  const completedCount = lessonList.filter((l) => l.progressStatus === 'COMPLETED').length;

  async function moveLesson(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= lessonList.length) return;
    const reordered = [...lessonList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);
    setReorderError(null);
    try {
      await reorder.mutateAsync(reordered.map((l) => l.id));
    } catch (err) {
      setReorderError(err);
    }
  }

  async function handleGenerate() {
    setGenerateError(null);
    try {
      const job = await generate.mutateAsync({ difficulty });
      setActiveJobId(job.id);
    } catch (err) {
      setGenerateError(err);
    }
  }

  const refetchLessons = lessons.refetch;
  const handleJobDone = useCallback(
    (result: { succeeded: boolean }) => {
      setActiveJobId(null);
      if (result.succeeded) void refetchLessons();
    },
    [refetchLessons],
  );

  async function pickAndUpload() {
    setUploadError(null);
    const picked = await DocumentPicker.getDocumentAsync({ type: PICKER_TYPES, copyToCacheDirectory: true });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    try {
      await upload.mutateAsync(asset);
    } catch (err) {
      setUploadError(err);
    }
  }

  const refresh = () => Promise.all([course.refetch(), documents.refetch(), lessons.refetch()]);

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

  /** Bài nút chính sẽ mở: đang học dở → chưa bắt đầu đầu tiên → bài đầu (xem lại). */
  const resume =
    lessonList.find((l) => l.progressStatus === 'IN_PROGRESS') ??
    lessonList.find((l) => l.progressStatus === 'NOT_STARTED') ??
    lessonList[0];
  const allDone = completedCount === lessonList.length && lessonList.length > 0;
  const resumeLabel = allDone
    ? 'Xem lại'
    : resume?.progressStatus === 'NOT_STARTED' && completedCount === 0
      ? 'Bắt đầu học'
      : 'Tiếp tục học';
  const docList = documents.data?.documents ?? [];

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: course.data.title }} />

      <View style={{ gap: space.md }}>
        <CourseCover id={courseId} title={course.data.title} style={styles.cover} initialSize={44} />
        <Txt variant="display" accessibilityRole="header">
          {course.data.title}
        </Txt>
        {course.data.description && (
          <Txt variant="body" tone="subtle">
            {course.data.description}
          </Txt>
        )}
        {resume && (
          <View style={{ gap: space.sm, marginTop: space.xs }}>
            <Button
              label={resumeLabel}
              iconRight="arrow-right"
              fullWidth
              onPress={() => router.push(routes.lesson(courseId, resume.id))}
            />
            <Txt variant="small" tone="subtle" numberOfLines={1}>
              {allDone ? 'Mở lại ' : 'Tiếp theo: '}
              <Txt variant="smallStrong">{resume.title}</Txt>
            </Txt>
          </View>
        )}
      </View>

      <View style={[styles.facts, { borderColor: p.line }]}>
        <View style={{ flex: 1.4, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            Tiến độ
          </Txt>
          <Txt variant="smallStrong" style={{ fontVariant: ['tabular-nums'] }}>
            {completedCount}/{lessonList.length} bài
          </Txt>
          {lessonList.length > 0 && (
            <ProgressBar
              value={completedCount}
              max={lessonList.length}
              height={4}
              label={`Đã hoàn thành ${completedCount} trên ${lessonList.length} bài`}
            />
          )}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            Tài liệu
          </Txt>
          <Txt variant="smallStrong">{docList.length}</Txt>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            Ngôn ngữ
          </Txt>
          <Txt variant="smallStrong">{course.data.language === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'}</Txt>
        </View>
      </View>

      {/* ------------------------------------------------ lộ trình */}
      <View>
        <SectionTitle title="Lộ trình bài học" description="Chạm vào một bài để học. Mũi tên đổi thứ tự." />

        <Card style={{ gap: space.md, marginBottom: space.lg }}>
          <Txt variant="smallStrong">Sinh bài học bằng AI</Txt>
          {/* Độ khó bài tập AI sẽ soạn (đi vào prompt `lesson@3`). */}
          <Segmented
            label="Độ khó bài tập"
            value={difficulty}
            options={DIFFICULTIES}
            onChange={setDifficulty}
            disabled={activeJobId !== null || generate.isPending}
          />
          <Button
            label={generate.isPending ? 'Đang tạo job…' : 'Sinh bài học'}
            icon="sparkles"
            variant="secondary"
            loading={generate.isPending}
            disabled={activeJobId !== null || !hasExtractedDoc}
            onPress={() => void handleGenerate()}
          />
          {/* Lý do nút xám phải nhìn thấy được — nút disabled không có tooltip. */}
          {!hasExtractedDoc && !documents.isLoading && (
            <Notice>
              <Txt variant="small" tone="muted">
                Cần ít nhất một tài liệu đã trích xuất xong thì mới sinh được bài học.
              </Txt>
            </Notice>
          )}
        </Card>

        {isQuotaExceededError(generateError) && (
          <QuotaNotice
            metric={generateError.meta.metric}
            limit={generateError.meta.limit}
            used={generateError.meta.used}
            style={{ marginBottom: space.md }}
          />
        )}
        {Boolean(generateError) && !isQuotaExceededError(generateError) && (
          <InlineError style={{ marginBottom: space.md }}>
            {errorText(generateError, 'Không sinh được bài học, vui lòng thử lại.')}
          </InlineError>
        )}
        {Boolean(reorderError) && (
          <InlineError style={{ marginBottom: space.md }}>
            {errorText(reorderError, 'Không sắp xếp lại được, vui lòng thử lại.')}
          </InlineError>
        )}

        {activeJobId && <AiJobProgress jobId={activeJobId} onDone={handleJobDone} />}
        {!activeJobId && lessons.isLoading && <LoadingState rows={3} height={64} label="Đang tải bài học" />}
        {!activeJobId && lessons.isError && (
          <ErrorState
            title="Không tải được bài học"
            description={errorText(lessons.error, 'Vui lòng thử lại.')}
            onRetry={() => void lessons.refetch()}
          />
        )}
        {!activeJobId && lessons.data && lessonList.length === 0 && (
          <EmptyState
            title="Chưa có bài học nào"
            description={
              hasExtractedDoc
                ? 'Tài liệu đã sẵn sàng. Chạm "Sinh bài học" để tạo lộ trình.'
                : 'Tải tài liệu lên ở phần bên dưới, rồi chạm "Sinh bài học" để tạo lộ trình.'
            }
          />
        )}
        {!activeJobId && lessonList.length > 0 && (
          <LessonPath
            lessons={lessonList}
            courseId={courseId}
            onMove={(i, d) => void moveLesson(i, d)}
            reordering={reorder.isPending}
          />
        )}
      </View>

      {/* ------------------------------------------------ tài liệu */}
      <View>
        <SectionTitle title="Tài liệu nguồn" />
        <Card style={{ alignItems: 'center', gap: space.sm, borderStyle: 'dashed', borderColor: p.lineInput }}>
          <Icon name="upload" size={22} color={p.fgSubtle} />
          <Txt variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
            PDF có lớp chữ, Word (DOCX), PowerPoint (PPTX), TXT, Markdown. PDF scan chưa đọc được.
          </Txt>
          <Button
            label={upload.isPending ? 'Đang tải lên…' : 'Chọn tệp để tải lên'}
            icon="plus"
            variant="secondary"
            loading={upload.isPending}
            onPress={() => void pickAndUpload()}
          />
        </Card>

        {isQuotaExceededError(uploadError) && (
          <QuotaNotice
            metric={uploadError.meta.metric}
            limit={uploadError.meta.limit}
            used={uploadError.meta.used}
            style={{ marginTop: space.md }}
          />
        )}
        {Boolean(uploadError) && !isQuotaExceededError(uploadError) && (
          <InlineError style={{ marginTop: space.md }}>
            {errorText(uploadError, 'Tải tài liệu thất bại, vui lòng thử lại.')}
          </InlineError>
        )}

        <View style={{ marginTop: space.md }}>
          {documents.isLoading && <LoadingState rows={2} height={56} label="Đang tải tài liệu" />}
          {documents.isError && (
            <ErrorState
              title="Không tải được tài liệu"
              description={errorText(documents.error, 'Vui lòng thử lại.')}
              onRetry={() => void documents.refetch()}
            />
          )}
          {documents.data && docList.length === 0 && (
            <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
              Chưa có tài liệu nào trong khóa này.
            </Txt>
          )}
          {docList.length > 0 && (
            <Card padded={false}>
              {docList.map((doc, i) => (
                <View key={doc.id}>
                  {i > 0 && <Divider />}
                  <DocumentRow doc={doc} />
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}

function DocumentRow({ doc }: { doc: DocumentList }) {
  const p = usePalette();
  const failed = doc.status === 'FAILED';
  return (
    <View style={{ padding: space.md, gap: space.sm }}>
      <View style={styles.docRow}>
        <Icon name="file" size={20} color={failed ? p.fg : p.fgSubtle} />
        <View style={{ flex: 1 }}>
          <Txt variant="smallStrong" numberOfLines={1}>
            {doc.filename}
          </Txt>
          <Txt variant="caption" tone="subtle">
            {formatSize(doc.sizeBytes)}
            {doc.pageCount ? ` · ${doc.pageCount} trang` : ''}
            {doc.createdAt ? ` · ${relativeTime(doc.createdAt)}` : ''}
          </Txt>
        </View>
        <Badge
          label={DOC_STATUS_LABEL[doc.status] ?? humanizeCode(doc.status)}
          tone={failed ? 'strong' : doc.status === 'EXTRACTED' ? 'neutral' : 'outline'}
          icon={failed ? 'alert' : doc.status === 'EXTRACTED' ? 'check' : undefined}
        />
      </View>
      {failed && doc.errorMessage && <InlineError>{doc.errorMessage}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 140, borderRadius: radius.card },
  facts: {
    flexDirection: 'row',
    gap: space.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: space.md,
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
