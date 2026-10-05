import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  SectionTitle,
  Skeleton,
  Txt,
} from '@/components/ui';
import { useAdminMetrics } from '@/features/admin/admin-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

/**
 * Quản trị — bản rút gọn của `/admin` + `/admin/metrics` trên web: số liệu tổng và chi phí LLM
 * 7 ngày. Bảng người dùng / khóa học / gói đăng ký vẫn chỉ có trên web (màn lớn hợp bảng rộng).
 */
export default function AdminScreen() {
  const p = usePalette();
  const metrics = useAdminMetrics();

  if (metrics.isLoading) {
    return (
      <Screen topInset>
        <PageHeader title="Quản trị" />
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={84} style={styles.tile} />
          ))}
        </View>
      </Screen>
    );
  }

  if (metrics.isError || !metrics.data) {
    return (
      <Screen topInset onRefresh={metrics.refetch}>
        <PageHeader title="Quản trị" />
        <ErrorState
          title="Không tải được số liệu"
          description={errorText(metrics.error, 'Vui lòng thử lại.')}
          detail={errorDetail(metrics.error)}
          onRetry={() => void metrics.refetch()}
        />
      </Screen>
    );
  }

  const { totals, dailyCosts, generatedAt } = metrics.data;
  const week = dailyCosts.slice(-7);
  const maxCost = Math.max(...week.map((d) => d.totalCostUsd), 0.000001);

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: 'Người dùng', value: String(totals.users), sub: `+${totals.usersToday} hôm nay` },
    { label: 'Khóa học', value: String(totals.courses) },
    { label: 'Tài liệu', value: String(totals.documents) },
    { label: 'AI Job', value: String(totals.aiJobs), sub: `+${totals.aiJobsToday} hôm nay` },
    { label: 'Lượt nộp bài', value: String(totals.submissions) },
    { label: 'Chi phí LLM', value: usd(totals.totalCostUsd), sub: 'tổng từ trước tới nay' },
  ];

  return (
    <Screen topInset onRefresh={metrics.refetch}>
      <PageHeader
        title="Quản trị"
        description={`Cập nhật ${relativeTime(generatedAt)}. Bảng người dùng, khóa học và gói đăng ký có trên bản web.`}
      />

      <View style={styles.grid}>
        {tiles.map((t) => (
          <Card key={t.label} style={styles.tile}>
            <Txt variant="caption" tone="subtle">
              {t.label}
            </Txt>
            <Txt variant="title" style={{ fontVariant: ['tabular-nums'] }}>
              {t.value}
            </Txt>
            {t.sub && (
              <Txt variant="caption" tone="subtle">
                {t.sub}
              </Txt>
            )}
          </Card>
        ))}
      </View>

      <View>
        <SectionTitle title="Chi phí LLM 7 ngày" />
        {week.length === 0 ? (
          <EmptyState compact title="Chưa có lượt gọi LLM nào" description="Chi phí theo ngày sẽ hiện ở đây." />
        ) : (
          <Card style={{ gap: space.md }}>
            {week.map((d) => (
              <View
                key={d.date}
                accessible
                accessibilityLabel={`${d.date}: ${usd(d.totalCostUsd)}, ${d.jobCount} job`}
                style={styles.costRow}
              >
                <Txt variant="caption" tone="subtle" style={{ width: 44 }}>
                  {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                </Txt>
                <View style={[styles.track, { backgroundColor: p.track }]}>
                  <View
                    style={{
                      width: `${Math.max(2, Math.round((d.totalCostUsd / maxCost) * 100))}%`,
                      height: '100%',
                      backgroundColor: p.fgMuted,
                      borderRadius: radius.pill,
                    }}
                  />
                </View>
                <Txt variant="caption" style={{ width: 76, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                  {usd(d.totalCostUsd)}
                </Txt>
              </View>
            ))}
          </Card>
        )}
      </View>

      <Button label="AI Job" iconRight="arrow-right" variant="secondary" fullWidth onPress={() => router.push(routes.adminAiJobs)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '47%', flexGrow: 1, gap: space.xs },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { flex: 1, height: 8, borderRadius: radius.pill, overflow: 'hidden' },
});
