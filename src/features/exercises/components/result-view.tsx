import { router } from 'expo-router';
import { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExerciseRead, SubmissionResult } from '@/contracts';
import { Confetti } from '@/components/celebrate';
import { Mascot } from '@/components/mascot';
import { Badge, Button, Card, Icon, IconButton, Notice, ProgressRing, Screen, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { type AnswerState, describeCorrect, describeGiven, nextUnpassedExercise } from '../answers';
import { questionTypes } from '../question-types/registry';
import { ActionBar } from './action-bar';

export interface NextLesson {
  title: string;
  open: () => void;
}

export const ResultView = forwardRef<
  ScrollViewInstance,
  {
    data: ExerciseRead;
    result: SubmissionResult;
    answers: AnswerState;
    /** Bài học kế tiếp trong khóa — màn quyết định cách điều hướng. */
    nextLesson?: NextLesson;
    onRetry: () => void;
    onOpenExercise: (id: string) => void;
  }
>(function ResultView({ data, result, answers, nextLesson, onRetry, onOpenExercise }, ref) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const byQuestion = new Map(result.results.map((r) => [r.questionId, r]));
  const correctCount = result.results.filter((r) => r.isCorrect).length;
  const nextExercise = nextUnpassedExercise(data);

  // Chỉ bắn khi qua bài, một lần mỗi lượt nộp (như `celebrateSuccess()` của web).
  const [fire, setFire] = useState(0);
  useEffect(() => {
    if (result.passed) setFire((n) => n + 1);
  }, [result.passed, result.attemptNo]);

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Screen ref={ref} bottomSpace={110 + insets.bottom}>
        {/* HANDBOOK §13.2: `celebrate` khi người dùng qua bài. */}
        <Card emphasis={result.passed ? 'strong' : 'dashed'} style={styles.resultCard}>
          <Mascot state={result.passed ? 'celebrate' : 'confused'} size={96} />
          <Badge
            label={`${result.passed ? 'Đạt' : 'Chưa đạt'} · Lần ${result.attemptNo}`}
            icon={result.passed ? 'check' : 'alert'}
          />
          <View style={styles.scoreRow}>
            <ProgressRing
              value={result.score}
              max={Math.max(result.maxScore, 1)}
              size={72}
              stroke={7}
              label={`Đạt ${result.score} trên ${result.maxScore} điểm`}
            />
            <Txt variant="display" style={{ fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] }}>
              {result.score}
              <Txt variant="heading" tone="subtle">
                {' '}
                / {result.maxScore} điểm
              </Txt>
            </Txt>
          </View>
          <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
            {result.passed
              ? `Bạn đã hoàn thành bài tập, đúng ${correctCount}/${data.questions.length} câu.`
              : `Cần đạt ${data.passScore} điểm để qua bài. Xem lại các câu sai bên dưới.`}
          </Txt>
          {result.lessonCompleted ? (
            <View style={styles.inline}>
              <Icon name="book-check" size={16} />
              <Txt variant="smallStrong">Bạn đã hoàn thành cả bài học.</Txt>
            </View>
          ) : (
            result.passed &&
            nextExercise && (
              <Txt variant="small" tone="subtle">
                Còn bài tập chưa đạt. Đạt hết để hoàn thành bài học.
              </Txt>
            )
          )}
        </Card>

        <Txt variant="heading">Xem lại từng câu</Txt>
        {data.questions.map((q, i) => {
          const r = byQuestion.get(q.id);
          const isCorrect = r?.isCorrect ?? false;
          const given = answers[q.id];
          const { Review } = questionTypes[q.type];
          const correctText = r ? describeCorrect(q, r.correctAnswer) : null;
          const givenText = describeGiven(q, given);
          return (
            <Card key={q.id} emphasis={isCorrect ? 'none' : 'strong'} style={{ gap: space.md }}>
              <View style={styles.reviewHead}>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>
                  Câu {i + 1}. {q.prompt}
                </Txt>
                <Badge label={isCorrect ? 'Đúng' : 'Sai'} icon={isCorrect ? 'check' : 'x'} tone={isCorrect ? 'neutral' : 'strong'} />
              </View>

              {Review ? (
                <Review question={q} given={given} correct={r?.correctAnswer} isCorrect={isCorrect} />
              ) : (
                <View style={{ gap: 4 }}>
                  {givenText && (
                    <Txt variant="small">
                      <Txt variant="small" tone="subtle">
                        Bạn trả lời:{' '}
                      </Txt>
                      {givenText}
                    </Txt>
                  )}
                  {!isCorrect && correctText && (
                    <Txt variant="small">
                      <Txt variant="small" tone="subtle">
                        Đáp án đúng:{' '}
                      </Txt>
                      <Txt variant="smallStrong">{correctText}</Txt>
                    </Txt>
                  )}
                </View>
              )}

              {r?.explanation && (
                <Notice>
                  <Txt variant="small" tone="muted">
                    {r.explanation}
                  </Txt>
                </Notice>
              )}
            </Card>
          );
        })}
      </Screen>

      <ActionBar>
        <IconButton icon="arrow-left" label="Về bài học" onPress={() => router.back()} size={48} />
        <Button
          label="Làm lại"
          icon="retry"
          variant={result.passed ? 'secondary' : 'primary'}
          onPress={onRetry}
          style={result.passed && (nextExercise || nextLesson) ? undefined : { flex: 1 }}
        />
        {result.passed && nextExercise && (
          <Button label="Bài tập tiếp" iconRight="arrow-right" style={{ flex: 1 }} onPress={() => onOpenExercise(nextExercise.id)} />
        )}
        {result.passed && !nextExercise && result.lessonCompleted && nextLesson && (
          <Button
            label="Bài học tiếp"
            iconRight="arrow-right"
            accessibilityLabel={`Bài học tiếp theo: ${nextLesson.title}`}
            style={{ flex: 1 }}
            onPress={nextLesson.open}
          />
        )}
      </ActionBar>
      <Confetti fire={fire} />
    </View>
  );
});

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultCard: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  reviewHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
