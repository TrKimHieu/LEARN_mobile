import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LessonSummary } from '@/contracts';
import { Icon, IconButton, Txt } from '@/components/ui';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type NodeState = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

const STATE_LABEL: Record<NodeState, string> = {
  COMPLETED: 'Đã hoàn thành',
  IN_PROGRESS: 'Đang học',
  NOT_STARTED: 'Chưa bắt đầu',
};

/**
 * Lộ trình bài học dạng stepper dọc — port của `lesson-list.tsx` (ADR 012 của LEARN). Đường nối
 * mang thông tin: nét liền khi bài phía trên đã xong, nét đứt khi chưa; trạng thái luôn có icon +
 * chữ. Nút lên/xuống luôn hiện (không phụ thuộc rê chuột) — sắp xếp lại, user story C-02.
 */
export function LessonPath({
  lessons,
  courseId,
  onMove,
  reordering,
}: {
  lessons: LessonSummary[];
  courseId: string;
  onMove: (index: number, direction: -1 | 1) => void;
  reordering: boolean;
}) {
  const p = usePalette();
  return (
    <View>
      {lessons.map((lesson, i) => {
        const state = lesson.progressStatus as NodeState;
        const last = i === lessons.length - 1;
        return (
          <View key={lesson.id} style={styles.item}>
            <View style={styles.rail}>
              {state === 'COMPLETED' ? (
                <Icon name="circle-check" size={32} filled color={p.fgMuted} />
              ) : (
                <View
                  style={[
                    styles.marker,
                    {
                      borderColor: state === 'IN_PROGRESS' ? p.fgMuted : p.lineStrong,
                      backgroundColor: p.panel,
                    },
                  ]}
                >
                  <Txt variant="caption" tone={state === 'IN_PROGRESS' ? 'fg' : 'subtle'}>
                    {i + 1}
                  </Txt>
                </View>
              )}
              {!last && (
                <View
                  style={[
                    styles.line,
                    {
                      borderColor: state === 'COMPLETED' ? p.fgMuted : p.lineStrong,
                      borderStyle: state === 'COMPLETED' ? 'solid' : 'dashed',
                    },
                  ]}
                />
              )}
            </View>

            {/* Vùng bấm mở bài và nút sắp xếp là anh em, không lồng nhau. */}
            <View style={[styles.body, state === 'IN_PROGRESS' && { backgroundColor: p.muted }]}>
              <Pressable
                onPress={() => router.push(routes.lesson(courseId, lesson.id))}
                accessibilityRole="button"
                accessibilityLabel={`Bài ${i + 1}: ${lesson.title}, ${STATE_LABEL[state]}`}
                style={({ pressed }) => [styles.open, pressed && { opacity: 0.6 }]}
              >
                <Txt variant="bodyStrong">{lesson.title}</Txt>
                <Txt variant="caption" tone="subtle">
                  {STATE_LABEL[state]}
                  {lesson.bestScore !== null ? ` · ${lesson.bestScore} điểm` : ''}
                  {lesson.exerciseCount > 1 ? ` · ${lesson.exerciseCount} bài tập` : ''}
                </Txt>
                {lesson.confidence === 'LOW' && (
                  // NFR-AI-02: bài lệch nguồn phải lộ ra ngay ở danh sách.
                  <View style={styles.flag}>
                    <Icon name="alert" size={13} />
                    <Txt variant="caption">Cần kiểm tra</Txt>
                  </View>
                )}
              </Pressable>
              <View style={styles.moves}>
                <IconButton
                  icon="chevron-up"
                  label={`Chuyển "${lesson.title}" lên trên`}
                  disabled={i === 0 || reordering}
                  onPress={() => onMove(i, -1)}
                  size={36}
                />
                <IconButton
                  icon="chevron-down"
                  label={`Chuyển "${lesson.title}" xuống dưới`}
                  disabled={last || reordering}
                  onPress={() => onMove(i, 1)}
                  size={36}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.md },
  rail: { width: 32, alignItems: 'center', paddingTop: space.md },
  marker: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 0, borderLeftWidth: 2, marginTop: 4 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.xs,
    marginBottom: space.xs,
    borderRadius: radius.control,
  },
  open: { flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' },
  moves: { flexDirection: 'row' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
