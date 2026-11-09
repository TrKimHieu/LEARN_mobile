import { useState } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { space } from '@/theme/tokens';
import { Button } from './button';
import { Card } from './surface';
import { Txt } from './text';

/** No animation required; the hidden answer is not mounted or exposed to screen readers. */
type FlipCardProps = { cardId?: string; prompt: string; answer: string };

export function FlipCard(props: FlipCardProps) {
  // Remount on card or content change so even a one-frame render cannot expose the next answer.
  return <FlipCardFace key={JSON.stringify([props.cardId, props.prompt, props.answer])} {...props} />;
}

function FlipCardFace({ prompt, answer }: FlipCardProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card>
      <View style={{ gap: space.lg }}>
        <Txt variant="caption" tone="subtle">{revealed ? 'Đáp án' : 'Câu hỏi'}</Txt>
        <Txt selectable aria-live={Platform.OS === 'web' ? 'polite' : undefined}>{revealed ? answer : prompt}</Txt>
        <Button
          label={revealed ? 'Xem câu hỏi' : 'Lật thẻ xem đáp án'}
          variant="secondary"
          onPress={() => {
            setRevealed(!revealed);
            if (Platform.OS !== 'web') {
              AccessibilityInfo.announceForAccessibility(revealed ? `Câu hỏi: ${prompt}` : `Đáp án: ${answer}`);
            }
          }}
        />
      </View>
    </Card>
  );
}
