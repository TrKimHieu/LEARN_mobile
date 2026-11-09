import { StyleSheet, View } from 'react-native';
import type { ProgressOverview } from '@/contracts';
import { Grid, Icon, Txt, type IconName } from '@/components/ui';
import { useLayout } from '@/theme/layout';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

/** Bốn ô số liệu của màn Tổng quan — mỗi số liệu hiện đúng một lần (ADR 012). */
export function ProgressStats({ data }: { data: ProgressOverview }) {
  const { statColumns } = useLayout();
  return (
    <Grid columns={statColumns}>
      <Stat icon="flame" label="Chuỗi ngày học" value={String(data.activeStreak)} sub="ngày liên tiếp" />
      <Stat icon="book-check" label="Bài đã xong" value={`${data.completedLessons}/${data.totalLessons}`} />
      <Stat
        icon="star"
        label="Điểm trung bình"
        value={data.averageScore !== null ? data.averageScore.toFixed(1) : 'Chưa có'}
        sub={data.averageScore === null ? 'chưa nộp bài nào' : undefined}
      />
      <Stat icon="layers" label="Khóa học" value={String(data.courseCount)} />
    </Grid>
  );
}

function Stat({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  const p = usePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}
      style={[styles.stat, { backgroundColor: p.panel, borderColor: p.line }]}
    >
      <View style={styles.statHead}>
        <Icon name={icon} size={16} color={p.fgSubtle} />
        <Txt variant="caption" tone="subtle">
          {label}
        </Txt>
      </View>
      <Txt variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      {sub && (
        <Txt variant="caption" tone="subtle">
          {sub}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flexGrow: 1,
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
