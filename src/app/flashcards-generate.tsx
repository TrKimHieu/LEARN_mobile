import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Field, InlineError, ProgressBar, Screen, Segmented, Txt } from '@/components/ui';
import { generationErrorText, generationState } from '@/features/flashcards/drafts-logic';
import {
  useCancelFlashcardJob, useCourseDocuments, useCourseLessons, useCourseOptions, useFlashcardJob, useGenerateFlashcards,
} from '@/features/flashcards/flashcards-api';
import { errorText, isQuotaExceededError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';

type Kind = 'lesson' | 'document';

/** W2: AI sinh Thẻ nháp từ một bài học hoặc một tài liệu đã trích xuất. Thẻ nháp chưa có lịch ôn. */
export default function GenerateFlashcardsScreen() {
  const courses = useCourseOptions();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('lesson');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [count, setCount] = useState('10');
  const [jobId, setJobId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const lessons = useCourseLessons(kind === 'lesson' ? courseId ?? '' : '');
  const documents = useCourseDocuments(kind === 'document' ? courseId ?? '' : '');
  const generate = useGenerateFlashcards(courseId ?? '');
  const job = useFlashcardJob(jobId);
  const cancel = useCancelFlashcardJob(jobId);
  const state = generationState(job.data);

  const sources =
    kind === 'lesson'
      ? (lessons.data?.lessons ?? []).map((l) => ({ id: l.id, label: l.title }))
      : (documents.data?.documents ?? []).filter((d) => d.status === 'EXTRACTED').map((d) => ({ id: d.id, label: d.filename }));

  async function start() {
    const n = Number(count);
    if (!courseId || !sourceId) return setFormError('Chọn khóa học và nguồn để sinh thẻ.');
    if (!Number.isInteger(n) || n < 1 || n > 30) return setFormError('Số thẻ phải từ 1 đến 30.');
    setFormError(null);
    try {
      const res = await generate.mutateAsync({ ...(kind === 'lesson' ? { lessonId: sourceId } : { documentId: sourceId }), count: n });
      setJobId(res.id);
    } catch (e) {
      setFormError(isQuotaExceededError(e) ? 'Đã hết lượt AI trong tháng của gói hiện tại.' : errorText(e, 'Không bắt đầu được, vui lòng thử lại.'));
    }
  }

  const running = state === 'running';
  return (
    <Screen width="reading">
      <Card>
        <View style={{ gap: space.md }}>
          <Txt variant="smallStrong">Khóa học</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {(courses.data?.courses ?? []).map((c) => (
              <Button
                key={c.id}
                label={c.title}
                size="sm"
                variant={courseId === c.id ? 'primary' : 'secondary'}
                disabled={running}
                onPress={() => { setCourseId(c.id); setSourceId(null); }}
              />
            ))}
          </ScrollView>
          <Segmented
            label="Nguồn"
            value={kind}
            disabled={running}
            options={[{ value: 'lesson', label: 'Một bài học' }, { value: 'document', label: 'Một tài liệu' }] as const}
            onChange={(v) => { setKind(v); setSourceId(null); }}
          />
          {courseId && (
            sources.length === 0 ? (
              <Txt variant="small" tone="subtle">
                {kind === 'lesson' ? 'Khóa này chưa có bài học.' : 'Khóa này chưa có tài liệu đã trích xuất.'}
              </Txt>
            ) : (
              <View style={{ gap: space.sm }}>
                {sources.map((s) => (
                  <Button
                    key={s.id}
                    label={s.label}
                    size="sm"
                    variant={sourceId === s.id ? 'primary' : 'secondary'}
                    disabled={running}
                    onPress={() => setSourceId(s.id)}
                  />
                ))}
              </View>
            )
          )}
          <Field label="Số thẻ tối đa" keyboardType="number-pad" value={count} onChangeText={setCount} editable={!running} />
          {formError && <InlineError>{formError}</InlineError>}
          <Button label="Sinh thẻ bằng AI" icon="sparkles" loading={generate.isPending} disabled={running} onPress={() => void start()} />
        </View>
      </Card>

      {jobId && (
        <Card>
          <View style={{ gap: space.md }} accessibilityLiveRegion="polite">
            {running && (
              <>
                <Txt variant="smallStrong">{job.data?.progressLabel ?? 'Đang xếp hàng'}</Txt>
                <ProgressBar value={job.data?.progress ?? 0} max={100} label="Tiến độ sinh thẻ" />
                <Button label="Dừng" variant="secondary" loading={cancel.isPending} onPress={() => cancel.mutate()} />
              </>
            )}
            {state === 'done' && (
              <>
                <Txt variant="smallStrong">Đã sinh xong thẻ nháp.</Txt>
                <Button label="Duyệt thẻ nháp" onPress={() => router.push(routes.drafts(jobId))} />
              </>
            )}
            {state === 'cancelled' && <Txt variant="small">Đã huỷ.</Txt>}
            {state === 'failed' && <InlineError>{generationErrorText(job.data?.error)}</InlineError>}
            {job.error && <InlineError>{errorText(job.error, 'Không theo dõi được tiến độ.')}</InlineError>}
          </View>
        </Card>
      )}
    </Screen>
  );
}
