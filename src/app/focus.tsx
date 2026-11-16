import { useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { confirmAction } from '@/lib/dialog';
import { Button, Card, Field, Notice, ProgressRing, Screen, Txt } from '@/components/ui';
import { formatClock } from '@/features/focus/timer';
import { useFocusTimer } from '@/features/focus/use-focus-timer';
import { space } from '@/theme/tokens';

const PHASE_LABEL = { focus: 'Học', break: 'Nghỉ' } as const;

/** T3-2..T3-5: Pomodoro; thông báo hết chu kỳ qua expo-notifications; chu kỳ học xong ghi vào sổ thời gian học. */
export default function FocusScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId?: string; lessonId?: string }>();
  // Mở từ bài học thì thời gian học ghi theo khóa và bài (T3-5).
  const ctx = useMemo(() => ({ courseId, lessonId }), [courseId, lessonId]);
  const f = useFocusTimer(ctx);
  const totalMs = (f.phase === 'focus' ? f.settings.focusMin : f.settings.breakMin) * 60_000;

  // T3-4: rời màn khi đang chạy thì hỏi trước. Tạm dừng rồi mới cho đi tiếp, khi chặn đã tắt.
  usePreventRemove(f.running, ({ repeat }) => {
    void confirmAction({
      title: 'Rời Pomodoro?',
      message: 'Bộ đếm sẽ tạm dừng. Quay lại để chạy tiếp.',
      confirmLabel: 'Tạm dừng và rời',
      cancelLabel: 'Ở lại',
    }).then((ok) => {
      if (!ok) return;
      f.pause();
      setTimeout(repeat, 0);
    });
  });

  return (
    <Screen width="reading">
      {f.finished && (
        <Notice>{f.finished === 'focus' ? 'Hết giờ học, nghỉ một chút.' : 'Hết giờ nghỉ, học tiếp nhé.'}</Notice>
      )}
      <Card>
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <ProgressRing value={totalMs - f.remainingMs} max={totalMs} size={200} stroke={10} label={`Thời gian ${PHASE_LABEL[f.phase]}`}>
            <Txt variant="display" accessibilityLiveRegion="polite">{formatClock(f.remainingMs)}</Txt>
            <Txt variant="small" tone="subtle">{PHASE_LABEL[f.phase]}</Txt>
          </ProgressRing>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {f.running ? (
              <Button label="Tạm dừng" variant="secondary" onPress={f.pause} />
            ) : (
              <Button label={f.inProgress ? 'Tiếp tục' : 'Bắt đầu'} onPress={f.start} disabled={!f.ready} />
            )}
            <Button label="Đặt lại" variant="ghost" icon="retry" onPress={f.reset} disabled={!f.inProgress} />
          </View>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Học (phút)"
            keyboardType="number-pad"
            defaultValue={String(f.settings.focusMin)}
            key={`f${f.settings.focusMin}`}
            editable={!f.running}
            onEndEditing={(e) => f.setSettings({ focusMin: e.nativeEvent.text })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Nghỉ (phút)"
            keyboardType="number-pad"
            defaultValue={String(f.settings.breakMin)}
            key={`b${f.settings.breakMin}`}
            editable={!f.running}
            onEndEditing={(e) => f.setSettings({ breakMin: e.nativeEvent.text })}
          />
        </View>
      </View>
    </Screen>
  );
}
