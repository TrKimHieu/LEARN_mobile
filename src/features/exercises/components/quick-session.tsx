import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CheckResult, ExerciseRead, SubmissionResult } from '@/contracts';
import { Mascot, type MascotState } from '@/components/mascot';
import { Button, EmptyState, Icon, InlineError, LoadingState, Notice, ProgressBar, Screen, Txt } from '@/components/ui';
import { useOffline } from '@/features/offline/offline-provider';
import { errorText } from '@/lib/api-client';
import { markTodayDone } from '@/lib/today-store';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { type Answer, type AnswerState, describeCorrect } from '../answers';
import { useCheckAnswer, useSubmitExercise } from '../exercises-api';
import {
  canCheck, currentQuestion, isFinished, progress, recordCheck, startQuick, submissionAnswers, type QuickState,
} from '../quick-queue';
import { ActionBar } from './action-bar';
import { QuestionCard } from './question-card';

const MAX_DURATION_MS = 3_600_000;

export interface QuickSummary {
  bestStreak: number;
  durationMs: number;
}

/**
 * Luyện tập từng câu, chấm ngay (spec web 4.4). Câu sai quay lại cuối hàng một lần. Hết hàng thì nộp
 * một lần bằng lần trả lời đầu tiên của mỗi câu; rời màn giữa chừng thì không nộp gì.
 */
export function QuickSession({
  courseId,
  lessonId,
  data,
  onFinished,
  onExamMode,
}: {
  courseId: string;
  lessonId: string;
  data: ExerciseRead;
  /** `result` undefined = bài nộp đang chờ mạng. */
  onFinished: (result: SubmissionResult | undefined, answers: AnswerState, summary: QuickSummary) => void;
  onExamMode: () => void;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { kv } = useOffline();
  const check = useCheckAnswer(lessonId);
  const [sessionKey] = useState(() => randomUUID());
  const submit = useSubmitExercise(courseId, lessonId, sessionKey);
  const [state, setState] = useState<QuickState>(() => startQuick(data.questions.map((q) => q.id)));
  const [answer, setAnswer] = useState<Answer | undefined>();
  const [verdict, setVerdict] = useState<{ answer: Answer; result: CheckResult } | null>(null);
  const [mood, setMood] = useState<MascotState>('listening');
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const durationMs = useRef(0);

  const questionId = currentQuestion(state);
  const question = data.questions.find((q) => q.id === questionId);
  const { done, total } = progress(state);
  const streak = verdict ? (verdict.result.isCorrect ? state.streak + 1 : 0) : state.streak;

  async function runCheck() {
    if (check.isPending || !answer || !canCheck(answer)) return;
    setError(null);
    try {
      const result = await check.mutateAsync({ exerciseId: data.id, answer });
      const nextStreak = result.isCorrect ? state.streak + 1 : 0;
      setVerdict({ answer, result });
      setMood(result.isCorrect ? (nextStreak >= 3 ? 'celebrate' : 'happy') : 'confused');
    } catch (err) {
      setError(errorText(err, 'Không kiểm tra được, vui lòng thử lại.'));
    }
  }

  async function finish(s: QuickState) {
    setError(null);
    try {
      const res = await submit.mutateAsync({
        exerciseId: data.id,
        answers: submissionAnswers(s),
        durationMs: Math.min(durationMs.current, MAX_DURATION_MS),
      });
      // Nộp (kể cả khi đang chờ mạng) là xong việc "Luyện lại" hôm nay, không cần phải đạt.
      void markTodayDone(kv, `exercise:${data.id}`);
      onFinished(res, s.firstAnswers, { bestStreak: s.bestStreak, durationMs: durationMs.current });
    } catch (err) {
      setError(errorText(err, 'Nộp bài thất bại, vui lòng thử lại.'));
    }
  }

  function next() {
    if (!verdict) return;
    const s = recordCheck(state, verdict.answer, verdict.result.isCorrect);
    setState(s);
    setAnswer(undefined);
    setVerdict(null);
    setMood('listening');
    if (isFinished(s)) {
      durationMs.current = Math.max(1, Date.now() - startedAt);
      void finish(s);
    }
  }

  if (data.questions.length === 0) {
    return <Screen width="reading"><EmptyState title="Bài tập này chưa có câu hỏi" description="Sinh lại bài học để có bài tập." /></Screen>;
  }
  if (!question) {
    return (
      <Screen width="reading">
        {error ? (
          <View style={{ gap: space.md }}>
            <InlineError>{error}</InlineError>
            <Button label="Thử lại" onPress={() => void finish(state)} />
          </View>
        ) : (
          <LoadingState rows={2} height={120} label="Đang nộp bài" />
        )}
      </Screen>
    );
  }

  const correctText = verdict && !verdict.result.isCorrect ? describeCorrect(question, verdict.result.correctAnswer) : null;

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Screen width="reading" bottomSpace={170 + insets.bottom}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <ProgressBar value={done} max={total} label={`Đã làm ${done} trên ${total} câu`} />
          </View>
          {streak >= 2 && (
            <View style={styles.streak} accessible accessibilityLabel={`Chuỗi đúng ${streak} câu`}>
              <Icon name="flame" size={16} color={p.primary} />
              <Txt variant="smallStrong">{streak}</Txt>
            </View>
          )}
        </View>
        {/* Đã kiểm tra thì khoá đáp án: lần trả lời được ghi là lần vừa chấm. */}
        <View pointerEvents={verdict ? 'none' : 'auto'} accessibilityState={{ disabled: Boolean(verdict) }}>
          <QuestionCard
            index={data.questions.indexOf(question) + 1}
            question={question}
            value={answer}
            missing={false}
            onChange={(a) => {
              setAnswer(a);
              setError(null);
            }}
          />
        </View>
        <Button label="Làm kiểu kiểm tra" variant="ghost" size="sm" onPress={onExamMode} style={{ alignSelf: 'flex-start' }} />
        {error && (
          <View style={{ gap: space.sm }}>
            <InlineError>{error}</InlineError>
            <Button label="Thử lại" variant="secondary" size="sm" onPress={() => void runCheck()} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}
      </Screen>

      <ActionBar>
        <View style={styles.bar}>
          <Mascot state={mood} size={44} />
          <View style={{ flex: 1, gap: 2 }} accessibilityLiveRegion="polite">
            {verdict?.result.isCorrect && (
              <View style={styles.inline}>
                <Icon name="check" size={16} color={p.primary} />
                <Txt variant="smallStrong">Chính xác!</Txt>
              </View>
            )}
            {verdict && !verdict.result.isCorrect && (
              <Txt variant="smallStrong" numberOfLines={3}>{correctText ? `Đáp án: ${correctText}` : 'Chưa đúng'}</Txt>
            )}
            {verdict?.result.explanation && (
              <Txt variant="caption" tone="subtle" numberOfLines={3}>{verdict.result.explanation}</Txt>
            )}
          </View>
          {verdict ? (
            <Button label={verdict.result.isCorrect ? 'Tiếp' : 'Hiểu rồi'} onPress={next} />
          ) : (
            <Button label="Kiểm tra" loading={check.isPending} disabled={!canCheck(answer)} onPress={() => void runCheck()} />
          )}
        </View>
      </ActionBar>
    </View>
  );
}

/** Mất mạng giữa chừng: báo và chuyển sang chế độ kiểm tra (bài nộp vào hàng chờ như trước). */
export function OfflineNotice({ onExamMode }: { onExamMode: () => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Notice>Chấm từng câu cần mạng. Bạn vẫn làm được kiểu kiểm tra; bài nộp sẽ gửi khi có mạng.</Notice>
      <Button label="Làm kiểu kiểm tra" variant="secondary" onPress={onExamMode} />
      <Button label="Về bài học" variant="ghost" onPress={() => router.back()} />
    </View>
  );
}


const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
