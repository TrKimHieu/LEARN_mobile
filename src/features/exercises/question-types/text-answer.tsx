import { StyleSheet, TextInput } from 'react-native';
import { usePalette } from '@/theme/theme';
import { font, radius, space } from '@/theme/tokens';
import type { QuestionInputProps, QuestionTypeModule } from './types';

/** Câu trả lời tự gõ. `multiline`: câu trả lời ngắn cần nhiều dòng; điền chỗ trống chỉ một dòng. */
function textAnswer(type: 'SHORT_ANSWER' | 'FILL_BLANK', multiline: boolean): QuestionTypeModule {
  function Input({ index, question, value, onChange }: QuestionInputProps) {
    const p = usePalette();
    return (
      <TextInput
        value={value && 'text' in value ? value.text : ''}
        onChangeText={(text) => onChange({ type, questionId: question.id, text })}
        placeholder="Nhập câu trả lời…"
        placeholderTextColor={p.fgSubtle}
        accessibilityLabel={`Câu trả lời câu ${index}`}
        multiline={multiline}
        style={[
          styles.input,
          { color: p.fg, borderColor: p.lineInput, backgroundColor: p.panel, minHeight: multiline ? 88 : 48 },
        ]}
      />
    );
  }
  return { Input };
}

export const shortAnswer = textAnswer('SHORT_ANSWER', true);
export const fillBlank = textAnswer('FILL_BLANK', false);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: font.regular,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
