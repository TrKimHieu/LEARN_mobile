import { StyleSheet, View } from 'react-native';
import { Icon, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { correctOptionId } from '../answers';
import { LetterChip, Option } from './choice';
import type { QuestionInputProps, QuestionReviewProps, QuestionTypeModule } from './types';

function Input({ index, question, value, onChange }: QuestionInputProps) {
  return (
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
  );
}

function Review({ question, given, correct }: QuestionReviewProps) {
  const p = usePalette();
  const correctId = correctOptionId(correct);
  return (
    <View style={{ gap: space.sm }}>
      {question.options.map((opt) => {
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
  );
}

export const multipleChoice: QuestionTypeModule = { Input, Review };

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.control,
  },
});
