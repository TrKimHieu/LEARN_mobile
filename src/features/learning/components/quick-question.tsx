import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CheckResult } from '@/contracts';
import { Mascot } from '@/components/mascot';
import { Button, Card, Icon, InlineError, Txt } from '@/components/ui';
import { type Answer, type Question, describeCorrect } from '@/features/exercises/answers';
import { QuestionCard } from '@/features/exercises/components/question-card';
import { useCheckAnswer } from '@/features/exercises/exercises-api';
import { canCheck } from '@/features/exercises/quick-queue';
import { errorText } from '@/lib/api-client';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

/**
 * Câu hỏi nhanh xen giữa các bước bài học (spec web 4.3). Chấm qua API, không ghi điểm, không ảnh hưởng
 * điểm cao nhất. Đáp án chỉ hiện sau khi người học đã trả lời.
 */
export function QuickQuestion({
  lessonId,
  exerciseId,
  question,
  onDone,
}: {
  lessonId: string;
  exerciseId: string;
  question: Question;
  onDone: () => void;
}) {
  const p = usePalette();
  const check = useCheckAnswer(lessonId);
  const [answer, setAnswer] = useState<Answer | undefined>();
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!answer || !canCheck(answer) || check.isPending) return;
    setError(null);
    try {
      setResult(await check.mutateAsync({ exerciseId, answer }));
    } catch (err) {
      setError(errorText(err, 'Không kiểm tra được, vui lòng thử lại.'));
    }
  }

  const correctText = result && !result.isCorrect ? describeCorrect(question, result.correctAnswer) : null;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.head}>
        <Mascot state={result ? (result.isCorrect ? 'happy' : 'confused') : 'listening'} size={48} />
        <Txt variant="heading">Câu hỏi nhanh</Txt>
      </View>
      <View pointerEvents={result ? 'none' : 'auto'} accessibilityState={{ disabled: Boolean(result) }}>
        <QuestionCard index={1} question={question} value={answer} missing={false} onChange={setAnswer} />
      </View>
      {result && (
        <Card style={{ gap: space.xs }}>
          <View style={styles.head} accessibilityLiveRegion="polite">
            <Icon name={result.isCorrect ? 'check' : 'x'} size={18} color={result.isCorrect ? p.primary : p.fg} />
            <Txt variant="smallStrong">
              {result.isCorrect ? 'Chính xác!' : correctText ? `Đáp án: ${correctText}` : 'Chưa đúng'}
            </Txt>
          </View>
          {result.explanation && <Txt variant="small" tone="subtle">{result.explanation}</Txt>}
        </Card>
      )}
      {error && <InlineError>{error}</InlineError>}
      {result ? (
        <Button label="Tiếp" onPress={onDone} />
      ) : (
        <View style={styles.actions}>
          <Button label="Bỏ qua" variant="ghost" onPress={onDone} />
          <Button label="Kiểm tra" loading={check.isPending} disabled={!canCheck(answer)} onPress={() => void run()} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
});
