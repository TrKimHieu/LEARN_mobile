import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Markdown, useMarkdown } from "@/components/markdown";
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  IconButton,
  InlineError,
  ProgressBar,
  Screen,
  Skeleton,
  Txt,
} from "@/components/ui";
import { useExercise } from "@/features/exercises/exercises-api";
import { QuickQuestion } from "@/features/learning/components/quick-question";
import { tocModeFor } from "@/features/navigation/screen-modes";
import { useOffline } from "@/features/offline/offline-provider";
import { ReviewEntry } from "@/features/reviews/components/review-entry";
import {
  LessonSources,
  LowConfidenceNotice,
} from "@/features/learning/components/lesson-sources";
import {
  useDeleteLesson,
  useLesson,
  useLessons,
  useStartLesson,
} from "@/features/learning/learning-api";
import {
  buildSequence,
  clampStep,
  eligibleQuizIds,
  isLastItem,
  splitSteps,
} from "@/features/learning/lesson-steps";
import { errorDetail, errorText } from "@/lib/api-client";
import { confirmAction } from "@/lib/dialog";
import { humanizeCode, relativeTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import { markTodayDone, readToday, writeToday } from "@/lib/today-store";
import { ALL_ORIENTATIONS, useLayout } from "@/theme/layout";
import { usePalette } from "@/theme/theme";
import { radius, space } from "@/theme/tokens";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang học",
  COMPLETED: "Đã hoàn thành",
};

const stepKey = (lessonId: string) => `lesson-step:${lessonId}`;

/**
 * Bài học chia bước (spec web 4.3): mỗi tiêu đề `##` là một bước, sau mỗi 2 bước một câu hỏi nhanh
 * lấy từ bài tập của bài (chỉ trắc nghiệm và đúng/sai). Nhớ bước đang đọc theo tài khoản. Tới bước
 * cuối là đã đọc xong bài (việc "học bài" hôm nay).
 */
export default function LessonScreen() {
  const { kv } = useOffline();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const tocSide = tocModeFor(layout) === "side";
  const { courseId, lessonId } = useLocalSearchParams<{
    courseId: string;
    lessonId: string;
  }>();
  const lesson = useLesson(courseId, lessonId);
  const lessons = useLessons(courseId); // cùng key với màn khóa học — thường có sẵn trong cache
  const exercise = useExercise(lessonId);
  const start = useStartLesson(courseId, lessonId);
  const del = useDeleteLesson(courseId);
  const startMutate = start.mutate;

  const scrollRef = useRef<ScrollViewInstance>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [index, setIndex] = useState(0);
  const [restored, setRestored] = useState(false);

  // Mở bài lần đầu → đánh dấu IN_PROGRESS (như web).
  useEffect(() => {
    if (lesson.data && lesson.data.progress.status === "NOT_STARTED")
      startMutate();
  }, [lesson.data?.id, lesson.data?.progress.status, startMutate]);

  // Bài LOW mở sẵn khối Nguồn.
  useEffect(() => {
    setSourcesOpen(lesson.data?.confidence === "LOW");
  }, [lesson.data?.id, lesson.data?.confidence]);

  const steps = useMemo(
    () => splitSteps(lesson.data?.contentMd ?? ""),
    [lesson.data?.contentMd],
  );
  const quizQuestions = useMemo(
    () => exercise.data?.questions ?? [],
    [exercise.data?.questions],
  );
  const sequence = useMemo(
    () => buildSequence(steps.length, eligibleQuizIds(quizQuestions)),
    [steps.length, quizQuestions],
  );
  const current = Math.min(index, Math.max(0, sequence.length - 1));
  const item = sequence[current];
  const last = isLastItem(current, sequence.length);
  const stepIndex = item?.kind === "step" ? item.step : null;
  const { tokens } = useMarkdown(stepIndex !== null ? (steps[stepIndex]?.markdown ?? "") : "");

  // Nhớ bước đang đọc theo bài: mở lại bài là về đúng chỗ.
  useEffect(() => {
    let alive = true;
    void readToday(kv, stepKey(lessonId)).then((raw) => {
      if (!alive) return;
      if (raw) setIndex(clampStep(raw, Number.MAX_SAFE_INTEGER));
      setRestored(true);
    });
    return () => {
      alive = false;
    };
  }, [kv, lessonId]);

  function go(next: number) {
    setIndex(next);
    if (restored) void writeToday(kv, stepKey(lessonId), String(next));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  // Tới bước cuối là xong việc "học bài" hôm nay.
  useEffect(() => {
    if (lesson.data && sequence.length > 0 && last) void markTodayDone(kv, `lesson:${lessonId}`);
  }, [lesson.data, sequence.length, last, kv, lessonId]);

  /** Vị trí trong khóa + bài sau — màn này không được là ngõ cụt. */
  const position = useMemo(() => {
    const list = lessons.data?.lessons ?? [];
    const i = list.findIndex((l) => l.id === lessonId);
    if (i < 0) return null;
    return { index: i, total: list.length, next: list[i + 1] };
  }, [lessons.data, lessonId]);

  /** Hành động phá huỷ luôn có bước xác nhận (NN/g — Consequential Options). */
  async function confirmDelete() {
    const ok = await confirmAction({
      title: "Xoá bài học này?",
      message: "Bài học và bài tập của nó sẽ bị xoá.",
      confirmLabel: "Xoá",
    });
    if (!ok) return;
    setDeleteError(null);
    try {
      await del.mutateAsync(lessonId);
      router.back();
    } catch (err) {
      setDeleteError(err);
    }
  }

  const titled = steps.filter((s) => s.title);
  const title = position ? `Bài ${position.index + 1}/${position.total}` : "Bài học";
  const headerRight = () => (
    <View style={styles.headerActions}>
      {titled.length > 1 && !tocSide && (
        <IconButton icon="list" label="Các bước" onPress={() => setTocOpen(true)} />
      )}
      {lesson.data && (
        <IconButton
          icon="edit"
          label="Sửa bài học"
          onPress={() => router.push(routes.editLesson(courseId, lessonId))}
        />
      )}
      {lesson.data && (
        <IconButton
          icon="trash"
          label="Xoá bài học"
          disabled={del.isPending}
          onPress={() => void confirmDelete()}
        />
      )}
    </View>
  );

  if (lesson.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <View accessible accessibilityLabel="Đang tải bài học" style={{ gap: space.md }}>
          <Skeleton height={20} width="30%" />
          <Skeleton height={36} width="85%" />
          <Skeleton height={320} />
        </View>
      </Screen>
    );
  }

  if (lesson.isError || !lesson.data) {
    return (
      <Screen onRefresh={() => lesson.refetch()}>
        <Stack.Screen options={{ title }} />
        <ErrorState
          title="Không tải được bài học"
          description={errorText(lesson.error, "Vui lòng thử lại.")}
          detail={errorDetail(lesson.error)}
          onRetry={() => void lesson.refetch()}
        />
      </Screen>
    );
  }

  const data = lesson.data;
  const status = data.progress.status;
  const quizQuestion =
    item?.kind === "quiz" ? quizQuestions.find((q) => q.id === item.questionId) : undefined;

  const stepList = (close: boolean) =>
    steps.map((s, i) =>
      s.title ? (
        <Pressable
          key={i}
          accessibilityRole="button"
          aria-current={stepIndex === i ? "step" : undefined}
          onPress={() => {
            if (close) setTocOpen(false);
            go(sequence.findIndex((x) => x.kind === "step" && x.step === i));
          }}
          style={({ pressed }) => [
            styles.tocItem,
            stepIndex === i && { backgroundColor: p.muted, borderLeftColor: p.fgMuted },
            pressed && { backgroundColor: p.muted },
          ]}
        >
          <Txt variant={stepIndex === i ? "smallStrong" : "small"} tone={stepIndex === i ? "fg" : "muted"}>
            {`${i + 1}. ${s.title}`}
          </Txt>
        </Pressable>
      ) : null,
    );

  const practice = () => {
    void markTodayDone(kv, `lesson:${lessonId}`);
    router.push(routes.practice(courseId, lessonId));
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Stack.Screen options={{ title, headerRight }} />
      <View style={styles.body}>
        <Screen
          width="reading"
          ref={scrollRef}
          onRefresh={() => lesson.refetch()}
          bottomSpace={120 + insets.bottom}
        >
          {sequence.length > 1 && (
            <ProgressBar
              value={current + 1}
              max={sequence.length}
              label={`Bước ${current + 1} trên ${sequence.length}`}
            />
          )}

          {current === 0 && (
            <View style={{ gap: space.md }}>
              <Badge
                label={STATUS_LABEL[status] ?? humanizeCode(status)}
                tone={status === "COMPLETED" ? "neutral" : "outline"}
                icon={status === "COMPLETED" ? "check" : undefined}
              />
              <Txt variant="display" accessibilityRole="header" selectable>
                {data.title}
              </Txt>
              {data.summary && (
                <Txt variant="body" tone="subtle" style={{ fontSize: 18, lineHeight: 27 }}>
                  {data.summary}
                </Txt>
              )}
              <View style={[styles.meta, { borderColor: p.line }]}>
                {data.estimatedMinutes ? (
                  <Meta icon="clock" text={`Khoảng ${data.estimatedMinutes} phút`} />
                ) : null}
                {data.progress.bestScore !== null && (
                  <Meta icon="star" text={`Điểm cao nhất ${data.progress.bestScore}`} />
                )}
                {data.editedByUserAt && (
                  <Meta icon="edit" text={`Đã chỉnh sửa ${relativeTime(data.editedByUserAt)}`} />
                )}
              </View>
              {data.confidence === "LOW" && (
                <LowConfidenceNotice onShowSources={() => go(sequence.length - 1)} />
              )}
            </View>
          )}

          {Boolean(deleteError) && (
            <InlineError>{errorText(deleteError, "Không xoá được, vui lòng thử lại.")}</InlineError>
          )}

          {item?.kind === "step" && <Markdown tokens={tokens} />}
          {item?.kind === "quiz" && quizQuestion && exercise.data && (
            <QuickQuestion
              key={quizQuestion.id}
              lessonId={lessonId}
              exerciseId={exercise.data.id}
              question={quizQuestion}
              onDone={() => go(current + 1)}
            />
          )}

          {last && (
            <>
              {data.sourceChunkIds.length > 0 && (
                <LessonSources
                  courseId={courseId}
                  lessonId={lessonId}
                  open={sourcesOpen}
                  onToggle={() => setSourcesOpen((v) => !v)}
                />
              )}
              <Button
                label="Học tập trung (Pomodoro)"
                variant="secondary"
                icon="clock"
                onPress={() => router.push(routes.focus({ courseId, lessonId }))}
              />
              <ReviewEntry />
            </>
          )}
        </Screen>
        {tocSide && titled.length > 1 && (
          <ScrollView
            style={[styles.side, { borderColor: p.line, backgroundColor: p.panel }]}
            contentContainerStyle={{ padding: space.md, paddingTop: space.lg }}
          >
            <Txt variant="heading" style={{ marginBottom: space.sm }}>
              Các bước
            </Txt>
            {stepList(false)}
          </ScrollView>
        )}
      </View>

      {/* Thanh hành động dính đáy — bước trước · Tiếp / Luyện tập ngay · bài sau. Câu hỏi nhanh tự dẫn bằng nút của nó. */}
      <View
        style={[
          styles.bar,
          { backgroundColor: p.panel, borderColor: p.line, paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <IconButton
          icon="arrow-left"
          label="Bước trước"
          disabled={current === 0}
          onPress={() => go(current - 1)}
          size={48}
        />
        {last ? (
          <Button label="Luyện tập ngay" icon="target" style={{ flex: 1 }} onPress={practice} />
        ) : item?.kind === "quiz" ? (
          <View style={{ flex: 1 }} />
        ) : (
          <Button label="Tiếp" iconRight="arrow-right" style={{ flex: 1 }} onPress={() => go(current + 1)} />
        )}
        <IconButton
          icon="chevron-right"
          label={position?.next ? `Bài sau: ${position.next.title}` : "Không có bài sau"}
          disabled={!position?.next}
          onPress={() => position?.next && router.replace(routes.lesson(courseId, position.next.id))}
          size={48}
        />
      </View>

      <Modal
        visible={tocOpen && !tocSide}
        transparent
        animationType="fade"
        supportedOrientations={ALL_ORIENTATIONS}
        onRequestClose={() => setTocOpen(false)}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: p.overlay }]} onPress={() => setTocOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: p.panel, paddingBottom: insets.bottom + space.lg }]}>
            <Txt variant="heading" style={{ marginBottom: space.sm }}>
              Các bước
            </Txt>
            <ScrollView style={{ maxHeight: 420 }}>{stepList(true)}</ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Meta({ icon, text }: { icon: "clock" | "star" | "edit"; text: string }) {
  const p = usePalette();
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={15} color={p.fgSubtle} />
      <Txt variant="small" tone="subtle">
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, flexDirection: "row" },
  side: { width: 280, flexGrow: 0, borderLeftWidth: StyleSheet.hairlineWidth * 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
    rowGap: space.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: space.md,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, padding: space.lg },
  tocItem: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.control,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
});
