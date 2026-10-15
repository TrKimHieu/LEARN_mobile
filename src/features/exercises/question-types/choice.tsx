import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { font, radius, space } from '@/theme/tokens';

/** Một lựa chọn bấm được — dùng chung cho các dạng câu hỏi chọn đáp án. */
export function Option({
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

export function LetterChip({ selected, children }: { selected: boolean; children: React.ReactNode }) {
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

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.control,
  },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
