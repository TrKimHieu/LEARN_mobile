import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ExerciseRead } from '@/contracts';
import { Icon, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

/** Chọn bài tập khi bài học có nhiều bài tập; dấu đạt bằng icon + chữ, không chỉ bằng màu. */
export function ExercisePicker({ data, onOpen }: { data: ExerciseRead; onOpen: (id: string) => void }) {
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

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
