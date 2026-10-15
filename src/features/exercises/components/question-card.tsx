import { StyleSheet, View } from 'react-native';
import { Card, Icon, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import type { Answer, Question } from '../answers';
import { questionTypes } from '../question-types/registry';

export function QuestionCard({
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
  const { Input } = questionTypes[question.type];
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
      <Input index={index} question={question} value={value} onChange={onChange} />
    </Card>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
