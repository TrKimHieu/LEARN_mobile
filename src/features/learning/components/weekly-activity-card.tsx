import { View } from 'react-native';
import { Card, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { buildWeeklyActivity } from '../weekly-activity';

/** W5: số lần làm bài 7 ngày gần nhất, như web. Số in trên cột nên không cần trục. */
export function WeeklyActivityCard({ items }: { items: readonly { createdAt: string }[] }) {
  const p = usePalette();
  const week = buildWeeklyActivity(items);
  const total = week.reduce((n, d) => n + d.count, 0);
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <Card>
      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Txt variant="heading">{total} lần làm bài</Txt>
          <Txt variant="caption" tone="subtle">7 ngày gần nhất</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, height: 140 }}>
          {week.map((d) => (
            <View
              key={d.key}
              accessible
              accessibilityLabel={`${d.label}: ${d.count} lần`}
              style={{ flex: 1, alignItems: 'center', gap: space.xs }}
            >
              <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: radius.control, backgroundColor: p.track }}>
                {d.count > 0 && (
                  <View
                    style={{
                      height: `${Math.max(20, (d.count / max) * 100)}%`,
                      borderRadius: radius.control,
                      backgroundColor: p.primary,
                      alignItems: 'center',
                      paddingTop: 4,
                    }}
                  >
                    <Txt variant="caption" style={{ color: p.primaryFg }}>{d.count}</Txt>
                  </View>
                )}
              </View>
              <Txt variant="caption" tone={d.isToday ? 'fg' : 'subtle'}>{d.label}</Txt>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
