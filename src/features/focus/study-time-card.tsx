import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Card, ProgressBar, Txt } from '@/components/ui';
import { useOffline } from '@/features/offline/offline-provider';
import { space } from '@/theme/tokens';
import { lastDays, parseLog, STUDY_LOG_KEY } from './study-log';

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** T3-6: phút học Pomodoro 7 ngày gần nhất, chỉ của máy này. */
export function StudyTimeCard() {
  const { kv } = useOffline();
  const log = useQuery({
    queryKey: ['study-log'],
    enabled: !!kv,
    queryFn: async () => parseLog(await kv!.get(STUDY_LOG_KEY)),
  });
  if (!log.data) return null;
  const days = lastDays(log.data, new Date());
  const total = days.reduce((n, d) => n + d.minutes, 0);
  const max = Math.max(1, ...days.map((d) => d.minutes));
  return (
    <Card>
      <View style={{ gap: space.sm }}>
        <Txt variant="heading">Thời gian học 7 ngày · {total} phút</Txt>
        <Txt variant="caption" tone="subtle">Tính từ Pomodoro trên máy này.</Txt>
        {days.map((d) => (
          <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Txt variant="caption" style={{ width: 28 }}>{WEEKDAY[new Date(`${d.date}T12:00:00`).getDay()]}</Txt>
            <View style={{ flex: 1 }}>
              <ProgressBar value={d.minutes} max={max} label={`${d.date}: ${d.minutes} phút`} />
            </View>
            <Txt variant="caption" tone="subtle" style={{ width: 52, textAlign: 'right' }}>{d.minutes} phút</Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}
