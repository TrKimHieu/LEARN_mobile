import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Markdown, useMarkdown } from '@/components/markdown';
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  IconButton,
  InlineError,
  Screen,
  Skeleton,
  Txt,
} from '@/components/ui';
import { LessonSources, LowConfidenceNotice } from '@/features/learning/lesson-sources';
import { useDeleteLesson, useLesson, useLessons, useStartLesson } from '@/features/learning/learning-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { humanizeCode, relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Đã hoàn thành',
};

export default function LessonScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const lesson = useLesson(courseId, lessonId);
  const lessons = useLessons(courseId); // cùng key với màn khóa học — thường có sẵn trong cache
  const start = useStartLesson(courseId, lessonId);
  const del = useDeleteLesson(courseId);
  const startMutate = start.mutate;

  const scrollRef = useRef<ScrollView>(null);
  const contentY = useRef(0);
  const blockY = useRef(new Map<number, number>());
  const sourcesY = useRef(0);
  const [tocOpen, setTocOpen] = useState(false);
  /** Mục đang đọc — `index` của heading cuối cùng đã cuộn qua đỉnh màn (như mục lục web). */
  const [activeHeading, setActiveHeading] = useState<number | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  // Mở bài lần đầu → đánh dấu IN_PROGRESS (như web).
  useEffect(() => {
    if (lesson.data && lesson.data.progress.status === 'NOT_STARTED') startMutate();
  }, [lesson.data?.id, lesson.data?.progress.status, startMutate]);

  // Bài LOW mở sẵn khối Nguồn: cảnh báo phía trên dẫn xuống đây.
  useEffect(() => {
    setSourcesOpen(lesson.data?.confidence === 'LOW');
  }, [lesson.data?.id, lesson.data?.confidence]);

  const { tokens, toc } = useMarkdown(lesson.data?.contentMd ?? '');

  /** Vị trí trong khóa + hai bài kề — màn này không được là ngõ cụt. */
  const position = useMemo(() => {
    const list = lessons.data?.lessons ?? [];
    const index = list.findIndex((l) => l.id === lessonId);
    if (index < 0) return null;
    return { index, total: list.length, prev: list[index - 1], next: list[index + 1] };
  }, [lessons.data, lessonId]);

  /** Hành động phá huỷ luôn có bước xác nhận (NN/g — Consequential Options). */
  async function confirmDelete() {
    const ok = await confirmAction({
      title: 'Xoá bài học này?',
      message: 'Bài học và bài tập của nó sẽ bị xoá.',
      confirmLabel: 'Xoá',
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

  function scrollToSources() {
    setSourcesOpen(true);
    scrollRef.current?.scrollTo({ y: Math.max(0, sourcesY.current - space.lg), animated: true });
  }

  const title = position ? `Bài ${position.index + 1}/${position.total}` : 'Bài học';
  const headerRight = () => (
    <View style={styles.headerActions}>
      {toc.length > 1 && <IconButton icon="list" label="Mục lục" onPress={() => setTocOpen(true)} />}
      {lesson.data && (
        <IconButton icon="edit" label="Sửa bài học" onPress={() => router.push(routes.editLesson(courseId, lessonId))} />
      )}
      {lesson.data && (
        <IconButton icon="trash" label="Xoá bài học" disabled={del.isPending} onPress={() => void confirmDelete()} />
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
          <Skeleton height={20} width="60%" />
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
          description={errorText(lesson.error, 'Vui lòng thử lại.')}
          detail={errorDetail(lesson.error)}
          onRetry={() => void lesson.refetch()}
        />
      </Screen>
    );
  }

  const data = lesson.data;
  const status = data.progress.status;

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <Stack.Screen options={{ title, headerRight }} />
      <Screen
        ref={scrollRef}
        onRefresh={() => lesson.refetch()}
        bottomSpace={120 + insets.bottom}
        scrollEventThrottle={100}
        onScroll={(e) => {
          if (toc.length < 2) return;
          const y = e.nativeEvent.contentOffset.y + 96;
          let current: number | null = null;
          for (const entry of toc) {
            if (contentY.current + (blockY.current.get(entry.index) ?? Infinity) <= y) current = entry.index;
          }
          setActiveHeading((prev) => (prev === current ? prev : current));
        }}
      >
        <View style={{ gap: space.md }}>
          <Badge
            label={STATUS_LABEL[status] ?? humanizeCode(status)}
            tone={status === 'COMPLETED' ? 'neutral' : 'outline'}
            icon={status === 'COMPLETED' ? 'check' : undefined}
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
            {data.estimatedMinutes ? <Meta icon="clock" text={`Khoảng ${data.estimatedMinutes} phút`} /> : null}
            {data.progress.bestScore !== null && <Meta icon="star" text={`Điểm cao nhất ${data.progress.bestScore}`} />}
            {data.editedByUserAt && <Meta icon="edit" text={`Đã chỉnh sửa ${relativeTime(data.editedByUserAt)}`} />}
          </View>
        </View>

        {data.confidence === 'LOW' && <LowConfidenceNotice onShowSources={scrollToSources} />}
        {Boolean(deleteError) && <InlineError>{errorText(deleteError, 'Không xoá được, vui lòng thử lại.')}</InlineError>}

        <View onLayout={(e) => (contentY.current = e.nativeEvent.layout.y)}>
          <Markdown tokens={tokens} onBlockLayout={(i, y) => blockY.current.set(i, y)} />
        </View>

        {data.sourceChunkIds.length > 0 && (
          <View onLayout={(e) => (sourcesY.current = e.nativeEvent.layout.y)}>
            <LessonSources
              courseId={courseId}
              lessonId={lessonId}
              open={sourcesOpen}
              onToggle={() => setSourcesOpen((v) => !v)}
            />
          </View>
        )}
      </Screen>

      {/* Thanh hành động dính đáy — bài trước · Làm bài tập · bài sau. */}
      <View
        style={[
          styles.bar,
          { backgroundColor: p.panel, borderColor: p.line, paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <IconButton
          icon="arrow-left"
          label={position?.prev ? `Bài trước: ${position.prev.title}` : 'Không có bài trước'}
          disabled={!position?.prev}
          onPress={() => position?.prev && router.replace(routes.lesson(courseId, position.prev.id))}
          size={48}
        />
        <Button
          label="Làm bài tập"
          icon="target"
          style={{ flex: 1 }}
          onPress={() => router.push(routes.practice(courseId, lessonId))}
        />
        <IconButton
          icon="arrow-right"
          label={position?.next ? `Bài sau: ${position.next.title}` : 'Không có bài sau'}
          disabled={!position?.next}
          onPress={() => position?.next && router.replace(routes.lesson(courseId, position.next.id))}
          size={48}
        />
      </View>

      <Modal visible={tocOpen} transparent animationType="fade" onRequestClose={() => setTocOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: p.overlay }]} onPress={() => setTocOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: p.panel, paddingBottom: insets.bottom + space.lg }]}>
            <Txt variant="heading" style={{ marginBottom: space.sm }}>
              Trong bài này
            </Txt>
            <ScrollView style={{ maxHeight: 420 }}>
              {toc.map((entry) => (
                <Pressable
                  key={entry.index}
                  accessibilityRole="button"
                  onPress={() => {
                    setTocOpen(false);
                    const y = contentY.current + (blockY.current.get(entry.index) ?? 0);
                    scrollRef.current?.scrollTo({ y: Math.max(0, y - space.md), animated: true });
                  }}
                  aria-current={activeHeading === entry.index ? 'location' : undefined}
                  style={({ pressed }) => [
                    styles.tocItem,
                    { paddingLeft: space.md + (entry.depth - 1) * space.lg },
                    activeHeading === entry.index && { backgroundColor: p.muted, borderLeftColor: p.fgMuted },
                    pressed && { backgroundColor: p.muted },
                  ]}
                >
                  <Txt
                    variant={entry.depth === 1 || activeHeading === entry.index ? 'smallStrong' : 'small'}
                    tone={activeHeading === entry.index || entry.depth === 1 ? 'fg' : 'muted'}
                  >
                    {entry.text}
                  </Txt>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Meta({ icon, text }: { icon: 'clock' | 'star' | 'edit'; text: string }) {
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.lg,
    rowGap: space.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: space.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, padding: space.lg },
  tocItem: {
    paddingVertical: space.md,
    paddingRight: space.md,
    borderRadius: radius.control,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
});
