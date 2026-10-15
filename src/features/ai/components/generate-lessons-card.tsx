import { useState } from 'react';
import { Button, Card, InlineError, Notice, QuotaNotice, Segmented, Txt } from '@/components/ui';
import { errorText, isQuotaExceededError } from '@/lib/api-client';
import { space } from '@/theme/tokens';
import { useGenerateLessons } from '../ai-api';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'EASY', label: 'Dễ' },
  { value: 'MEDIUM', label: 'Vừa' },
  { value: 'HARD', label: 'Khó' },
];

/**
 * Chọn độ khó rồi tạo AI Job sinh bài học. Màn giữ job đang chạy (`busy`) và hiển thị tiến trình;
 * thẻ này chỉ tạo job và báo lại id qua `onStarted`.
 */
export function GenerateLessonsCard({
  courseId,
  hasExtractedDoc,
  documentsLoading,
  busy,
  onStarted,
}: {
  courseId: string;
  hasExtractedDoc: boolean;
  documentsLoading: boolean;
  busy: boolean;
  onStarted: (jobId: string) => void;
}) {
  const generate = useGenerateLessons(courseId);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [error, setError] = useState<unknown>(null);

  async function handleGenerate() {
    setError(null);
    try {
      const job = await generate.mutateAsync({ difficulty });
      onStarted(job.id);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <Card style={{ gap: space.md, marginBottom: space.lg }}>
        <Txt variant="smallStrong">Sinh bài học bằng AI</Txt>
        {/* Độ khó bài tập AI sẽ soạn (đi vào prompt `lesson@3`). */}
        <Segmented
          label="Độ khó bài tập"
          value={difficulty}
          options={DIFFICULTIES}
          onChange={setDifficulty}
          disabled={busy || generate.isPending}
        />
        <Button
          label={generate.isPending ? 'Đang tạo job…' : 'Sinh bài học'}
          icon="sparkles"
          variant="secondary"
          loading={generate.isPending}
          disabled={busy || !hasExtractedDoc}
          onPress={() => void handleGenerate()}
        />
        {/* Lý do nút xám phải nhìn thấy được — nút disabled không có tooltip. */}
        {!hasExtractedDoc && !documentsLoading && (
          <Notice>
            <Txt variant="small" tone="muted">
              Cần ít nhất một tài liệu đã trích xuất xong thì mới sinh được bài học.
            </Txt>
          </Notice>
        )}
      </Card>

      {isQuotaExceededError(error) && (
        <QuotaNotice
          metric={error.meta.metric}
          limit={error.meta.limit}
          used={error.meta.used}
          style={{ marginBottom: space.md }}
        />
      )}
      {Boolean(error) && !isQuotaExceededError(error) && (
        <InlineError style={{ marginBottom: space.md }}>
          {errorText(error, 'Không sinh được bài học, vui lòng thử lại.')}
        </InlineError>
      )}
    </>
  );
}
