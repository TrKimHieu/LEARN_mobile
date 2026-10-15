import { View } from 'react-native';
import { Icon, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { Option } from './choice';
import type { QuestionInputProps, QuestionTypeModule } from './types';

function Input({ index, question, value, onChange }: QuestionInputProps) {
  const p = usePalette();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={`Câu ${index}`} style={{ flexDirection: 'row', gap: space.sm }}>
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
  );
}

export const trueFalse: QuestionTypeModule = { Input };
