import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExerciseRead, SubmissionResult } from '@/contracts';
import { Button, Icon, InlineError, ProgressBar, Screen, Txt } from '@/components/ui';
import { errorText } from '@/lib/api-client';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import type { Answer, AnswerState } from '../answers';
import { useSubmitExercise } from '../exercises-api';
import { ActionBar } from './action-bar';
import { ExercisePicker } from './exercise-picker';
import { QuestionCard } from './question-card';
import { type NextLesson, ResultView } from './result-view';

function haptic(kind: Haptics.NotificationFeedbackType) {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(kind).catch(() => undefined);
}

/**
 * Một phiên làm bài: trả lời → nộp → xem kết quả → làm lại. Đổi bài tập phải mount phiên mới
 * (`key={data.id}`) để câu trả lời của bài trước không sót lại.
 */
export function ExerciseSession({
  courseId,
  lessonId,
  data,
  nextLesson,
  onOpenExercise,
}: {
  courseId: string;
  lessonId: string;
  data: ExerciseRead;
  nextLesson?: NextLesson;
  onOpenExercise: (id: string) => void;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const submit = useSubmitExercise(courseId, lessonId);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const questionY = useRef(new Map<string, number>());
  const listY = useRef(0);
  const startedAt = useRef(Date.now());
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingId, setMissingId] = useState<string | null>(null);

  function setAnswer(a: Answer) {
    setAnswers((prev) => ({ ...prev, [a.questionId]: a }));
    setMissingId((cur) => (cur === a.questionId ? null : cur));
  }

  function scrollTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function handleSubmit() {
    setSubmitError(null);
    const list = Object.values(answers);
    if (list.length < data.questions.length) {
      // Đưa người học tới đúng câu còn thiếu và đánh dấu tại chỗ.
      const at = data.questions.findIndex((q) => !answers[q.id]);
      const first = data.questions[at];
      setSubmitError(`Câu ${at + 1} chưa được trả lời. Trả lời hết rồi mới nộp được.`);
      if (first) {
        setMissingId(first.id);
        const y = listY.current + (questionY.current.get(first.id) ?? 0);
        scrollRef.current?.scrollTo({ y: Math.max(0, y - space.lg), animated: true });
      }
      haptic(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setMissingId(null);
    try {
      const res = await submit.mutateAsync({
        answers: list,
        exerciseId: data.id,
        durationMs: Math.min(3_600_000, Math.max(1, Date.now() - startedAt.current)),
      });
      setResult(res);
      haptic(res.passed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      scrollTop();
    } catch (err) {
      setSubmitError(errorText(err, 'Nộp bài thất bại, vui lòng thử lại.'));
    }
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setSubmitError(null);
    startedAt.current = Date.now();
    scrollTop();
  }

  if (result) {
    return (
      <ResultView
        ref={scrollRef}
        data={data}
        result={result}
        answers={answers}
        nextLesson={nextLesson}
        onRetry={retry}
        onOpenExercise={onOpenExercise}
      />
    );
  }

  const answered = Object.keys(answers).length;
  const total = data.questions.length;
  const position = data.exercises.findIndex((e) => e.id === data.id);

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Screen ref={scrollRef} bottomSpace={130 + insets.bottom}>
        <ExercisePicker data={data} onOpen={onOpenExercise} />

        <View style={{ gap: space.sm }}>
          <Txt variant="small" tone="subtle">
            {data.exercises.length > 1 && position >= 0 ? `Bài tập ${position + 1}/${data.exercises.length}` : 'Bài tập'}
            {` · ${total} câu, cần ${data.passScore} điểm để qua`}
          </Txt>
          <Txt variant="display" accessibilityRole="header">
            {data.title ?? 'Bài tập'}
          </Txt>
          {data.instruction && (
            <Txt variant="body" tone="subtle">
              {data.instruction}
            </Txt>
          )}
          {data.bestSubmission && (
            <View style={styles.inline}>
              <Icon name="trophy" size={14} color={p.fgSubtle} />
              <Txt variant="small" tone="subtle">
                Điểm cao nhất trước đó: {data.bestSubmission.score}/{data.bestSubmission.maxScore} (lần{' '}
                {data.bestSubmission.attemptNo})
              </Txt>
            </View>
          )}
        </View>

        <View style={{ gap: space.md }} onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
          {data.questions.map((q, i) => (
            <View key={q.id} onLayout={(e) => questionY.current.set(q.id, e.nativeEvent.layout.y)}>
              <QuestionCard
                index={i + 1}
                question={q}
                value={answers[q.id]}
                onChange={setAnswer}
                missing={missingId === q.id}
              />
            </View>
          ))}
        </View>

        {submitError && <InlineError>{submitError}</InlineError>}
      </Screen>

      <ActionBar>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            {answered < total ? `Đã trả lời ${answered}/${total}, còn ${total - answered} câu` : 'Đã trả lời hết, sẵn sàng nộp'}
          </Txt>
          <ProgressBar value={answered} max={total} label={`Đã trả lời ${answered} trên ${total} câu`} />
        </View>
        <Button label={submit.isPending ? 'Đang nộp…' : 'Nộp bài'} loading={submit.isPending} onPress={() => void handleSubmit()} />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
