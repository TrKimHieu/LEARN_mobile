import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExerciseRead, SubmissionResult, SubmitExerciseInput } from '@/contracts';
import { Confetti } from '@/components/celebrate';
import { Mascot } from '@/components/mascot';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  InlineError,
  LoadingState,
  Notice,
  ProgressBar,
  ProgressRing,
  Screen,
  Txt,
} from '@/components/ui';
import { useExercise, useLessons, useSubmitExercise } from '@/features/learning/learning-api';
import { errorDetail, errorText, isNotFound } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { font, radius, space } from '@/theme/tokens';

type Answer = SubmitExerciseInput['answers'][number];
type AnswerState = Record<string, Answer>;
type Question = ExerciseRead['questions'][number];

/**
 * Đáp án đúng chỉ tồn tại trong `SubmissionResult` — tức là chỉ sau khi nộp bài `[SPEC]`. Kiểu từ
 * API là `unknown` (`{ optionId?, value?, acceptable? }`), bóc tách phòng thủ như web.
 */
function describeCorrect(q: Question, correct: unknown): string | null {
  if (correct === null || typeof correct !== 'object') return null;
  const c = correct as { optionId?: unknown; value?: unknown; acceptable?: unknown };
  if (q.type === 'MULTIPLE_CHOICE' && typeof c.optionId === 'string') {
    const opt = q.options.find((o) => o.id === c.optionId);
    return opt ? `${opt.label}. ${opt.content}` : null;
  }
  if (q.type === 'TRUE_FALSE' && typeof c.value === 'boolean') return c.value ? 'Đúng' : 'Sai';
  if (Array.isArray(c.acceptable)) {
    const list = c.acceptable.filter((x): x is string => typeof x === 'string');
    return list.length > 0 ? list.join(' · ') : null;
  }
  return null;
}

function correctOptionId(correct: unknown): string | null {
  if (correct === null || typeof correct !== 'object') return null;
  const id = (correct as { optionId?: unknown }).optionId;
  return typeof id === 'string' ? id : null;
}

function describeGiven(q: Question, a: Answer | undefined): string | null {
  if (!a) return null;
  if (a.type === 'MULTIPLE_CHOICE') {
    const opt = q.options.find((o) => o.id === a.optionId);
    return opt ? `${opt.label}. ${opt.content}` : null;
  }
  if (a.type === 'TRUE_FALSE') return a.value ? 'Đúng' : 'Sai';
  return a.text;
}

function haptic(kind: Haptics.NotificationFeedbackType) {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(kind).catch(() => undefined);
}

export default function PracticeScreen() {
  const { courseId, lessonId, exercise: exerciseParam } = useLocalSearchParams<{
    courseId: string;
    lessonId: string;
    exercise?: string;
  }>();
  const exercise = useExercise(lessonId, exerciseParam ?? '');
  // Bài tập đang mở nằm trong params: deep link hay quay lại vẫn đúng bài tập.
  const openExercise = (id: string) => router.setParams({ exercise: id });

  if (exercise.isLoading) {
    return (
      <Screen>
        <LoadingState rows={4} height={120} label="Đang tải bài tập" />
      </Screen>
    );
  }

  if (exercise.isError) {
    return (
      <Screen>
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
      onOpenExercise={openExercise}
    />
  );
}

function ExerciseSession({
  courseId,
  lessonId,
  data,
  onOpenExercise,
}: {
  courseId: string;
  lessonId: string;
  data: ExerciseRead;
  onOpenExercise: (id: string) => void;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const submit = useSubmitExercise(courseId, lessonId);
  const scrollRef = useRef<ScrollView>(null);
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
        courseId={courseId}
        lessonId={lessonId}
        data={data}
        result={result}
        answers={answers}
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

      <View style={[styles.bar, { backgroundColor: p.panel, borderColor: p.line, paddingBottom: insets.bottom + space.sm }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="caption" tone="subtle">
            {answered < total ? `Đã trả lời ${answered}/${total}, còn ${total - answered} câu` : 'Đã trả lời hết, sẵn sàng nộp'}
          </Txt>
          <ProgressBar value={answered} max={total} label={`Đã trả lời ${answered} trên ${total} câu`} />
        </View>
        <Button label={submit.isPending ? 'Đang nộp…' : 'Nộp bài'} loading={submit.isPending} onPress={() => void handleSubmit()} />
      </View>
    </View>
  );
}

/** Chọn bài tập khi bài học có nhiều bài tập; dấu đạt bằng icon + chữ, không chỉ bằng màu. */
function ExercisePicker({ data, onOpen }: { data: ExerciseRead; onOpen: (id: string) => void }) {
  const p = usePalette();
  if (data.exercises.length < 2) return null;
  const passed = data.exercises.filter((e) => e.passed).length;
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="caption" tone="subtle">
        Đã đạt {passed}/{data.exercises.length} bài tập. Đạt hết để hoàn thành bài học.
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {data.exercises.map((e, i) => {
          const current = e.id === data.id;
          return (
            <Pressable
              key={e.id}
              onPress={() => !current && onOpen(e.id)}
              role="tab"
              aria-selected={current}
              accessibilityLabel={`Bài tập ${i + 1}${e.passed ? ', đã đạt' : ', chưa đạt'}`}
              style={[
                styles.chip,
                {
                  backgroundColor: current ? p.primary : p.panel,
                  borderColor: current ? p.primary : p.line,
                },
              ]}
            >
              {e.passed && <Icon name="check" size={14} weight="bold" color={current ? p.primaryFg : p.fg} />}
              <Txt variant="smallStrong" style={{ color: current ? p.primaryFg : p.fg }}>
                Bài tập {i + 1}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
  missing,
}: {
  index: number;
  question: Question;
  value: Answer | undefined;
  onChange: (a: Answer) => void;
  missing: boolean;
}) {
  const p = usePalette();
  return (
    <Card emphasis={missing ? 'strong' : 'none'} style={[{ gap: space.md }, missing && { backgroundColor: p.panel2 }]}>
      <View style={styles.inline}>
        <Txt variant="bodyStrong" tone="subtle" style={{ alignSelf: 'flex-start' }}>
          {index}.
        </Txt>
        <Txt variant="bodyStrong" style={{ flex: 1 }}>
          {question.prompt}
        </Txt>
      </View>
      {missing && (
        <View style={styles.inline}>
          <Icon name="alert" size={14} />
          <Txt variant="caption">Câu này chưa được trả lời.</Txt>
        </View>
      )}

      {question.type === 'MULTIPLE_CHOICE' && (
        <View accessibilityRole="radiogroup" accessibilityLabel={`Câu ${index}`} style={{ gap: space.sm }}>
          {question.options.map((opt) => {
            const selected = value?.type === 'MULTIPLE_CHOICE' && value.optionId === opt.id;
            return (
              <Option
                key={opt.id}
                selected={selected}
                label={`${opt.label}. ${opt.content}`}
                onPress={() => onChange({ type: 'MULTIPLE_CHOICE', questionId: question.id, optionId: opt.id })}
              >
                <LetterChip selected={selected}>{opt.label}</LetterChip>
                <Txt variant="body" style={{ flex: 1 }}>
                  {opt.content}
                </Txt>
              </Option>
            );
          })}
        </View>
      )}

      {question.type === 'TRUE_FALSE' && (
        <View accessibilityRole="radiogroup" accessibilityLabel={`Câu ${index}`} style={styles.tf}>
          {[true, false].map((v) => {
            const selected = value?.type === 'TRUE_FALSE' && value.value === v;
            return (
              <View key={String(v)} style={{ flex: 1 }}>
                <Option
                  selected={selected}
                  label={v ? 'Đúng' : 'Sai'}
                  onPress={() => onChange({ type: 'TRUE_FALSE', questionId: question.id, value: v })}
                  center
                >
                  <Icon name={v ? 'check' : 'x'} size={16} color={p.fgSubtle} />
                  <Txt variant="bodyStrong">{v ? 'Đúng' : 'Sai'}</Txt>
                </Option>
              </View>
            );
          })}
        </View>
      )}

      {(question.type === 'SHORT_ANSWER' || question.type === 'FILL_BLANK') && (
        <TextInput
          value={value && 'text' in value ? value.text : ''}
          onChangeText={(text) =>
            onChange(
              question.type === 'SHORT_ANSWER'
                ? { type: 'SHORT_ANSWER', questionId: question.id, text }
                : { type: 'FILL_BLANK', questionId: question.id, text },
            )
          }
          placeholder="Nhập câu trả lời…"
          placeholderTextColor={p.fgSubtle}
          accessibilityLabel={`Câu trả lời câu ${index}`}
          multiline={question.type === 'SHORT_ANSWER'}
          style={[
            styles.textAnswer,
            {
              color: p.fg,
              borderColor: p.lineInput,
              backgroundColor: p.panel,
              minHeight: question.type === 'SHORT_ANSWER' ? 88 : 48,
            },
          ]}
        />
      )}
    </Card>
  );
}

function Option({
  selected,
  label,
  onPress,
  center = false,
  children,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  center?: boolean;
  children: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      role="radio"
      aria-checked={selected}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        {
          justifyContent: center ? 'center' : 'flex-start',
          borderColor: selected ? p.fgMuted : p.line,
          borderWidth: selected ? 1.5 : 1,
          backgroundColor: selected ? p.muted : pressed ? p.panel2 : p.panel,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function LetterChip({ selected, children }: { selected: boolean; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View
      style={[
        styles.letter,
        {
          backgroundColor: selected ? p.primary : p.panel,
          borderColor: selected ? p.primary : p.lineStrong,
        },
      ]}
    >
      <Txt variant="caption" style={{ color: selected ? p.primaryFg : p.fgMuted, fontFamily: font.semibold }}>
        {children}
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------ kết quả */

const ResultView = forwardRef<
  ScrollView,
  {
    courseId: string;
    lessonId: string;
    data: ExerciseRead;
    result: SubmissionResult;
    answers: AnswerState;
    onRetry: () => void;
    onOpenExercise: (id: string) => void;
  }
>(function ResultView({ courseId, lessonId, data, result, answers, onRetry, onOpenExercise }, ref) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const lessons = useLessons(courseId);
  const byQuestion = new Map(result.results.map((r) => [r.questionId, r]));
  const correctCount = result.results.filter((r) => r.isCorrect).length;

  // Bước kế tiếp: bài tập chưa đạt kế tiếp, rồi bài học kế tiếp khi đã xong cả bài. Loại bài tập
  // hiện tại khỏi ứng viên — `data.exercises` có thể chưa kịp làm mới sau lượt nộp.
  const position = data.exercises.findIndex((e) => e.id === data.id);
  const nextExercise =
    data.exercises.slice(position + 1).find((e) => !e.passed) ??
    data.exercises.slice(0, Math.max(position, 0)).find((e) => !e.passed);
  const list = lessons.data?.lessons ?? [];
  const lessonIndex = list.findIndex((l) => l.id === lessonId);
  const nextLesson = lessonIndex >= 0 ? list[lessonIndex + 1] : undefined;

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
          const correctId = correctOptionId(r?.correctAnswer);
          const correctText = r ? describeCorrect(q, r.correctAnswer) : null;
          const given = answers[q.id];
          const givenText = describeGiven(q, given);
          return (
            <Card key={q.id} emphasis={isCorrect ? 'none' : 'strong'} style={{ gap: space.md }}>
              <View style={styles.reviewHead}>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>
                  Câu {i + 1}. {q.prompt}
                </Txt>
                <Badge label={isCorrect ? 'Đúng' : 'Sai'} icon={isCorrect ? 'check' : 'x'} tone={isCorrect ? 'neutral' : 'strong'} />
              </View>

              {q.type === 'MULTIPLE_CHOICE' ? (
                <View style={{ gap: space.sm }}>
                  {q.options.map((opt) => {
                    const chosen = given?.type === 'MULTIPLE_CHOICE' && given.optionId === opt.id;
                    const right = correctId === opt.id;
                    // Đáp án đúng: viền liền đậm; lựa chọn sai: viền đứt (ADR 015 — không dựa vào màu).
                    return (
                      <View
                        key={opt.id}
                        style={[
                          styles.reviewOption,
                          {
                            borderColor: right ? p.fgMuted : chosen ? p.fgSubtle : p.line,
                            borderWidth: right ? 1.5 : 1,
                            borderStyle: chosen && !right ? 'dashed' : 'solid',
                            backgroundColor: right ? p.muted : p.panel,
                          },
                        ]}
                      >
                        <LetterChip selected={false}>{opt.label}</LetterChip>
                        <Txt variant="small" style={{ flex: 1 }}>
                          {opt.content}
                        </Txt>
                        {right && (
                          <View style={styles.inline}>
                            <Icon name="check" size={13} weight="bold" />
                            <Txt variant="caption">Đáp án đúng</Txt>
                          </View>
                        )}
                        {chosen && !right && (
                          <View style={styles.inline}>
                            <Icon name="x" size={13} weight="bold" />
                            <Txt variant="caption">Bạn chọn</Txt>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
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

      <View style={[styles.bar, { backgroundColor: p.panel, borderColor: p.line, paddingBottom: insets.bottom + space.sm }]}>
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
            onPress={() => {
              // Thay cả cặp bài học + bài tập: Back từ bài mới về khóa học, không về bài tập cũ.
              router.dismiss(2);
              router.push(routes.lesson(courseId, nextLesson.id));
            }}
          />
        )}
      </View>
      <Confetti fire={fire} />
    </View>
  );
});

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.control,
  },
  tf: { flexDirection: 'row', gap: space.sm },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAnswer: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: font.regular,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  resultCard: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  reviewHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.control,
  },
});
