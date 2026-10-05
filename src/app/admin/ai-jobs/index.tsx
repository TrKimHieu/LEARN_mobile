import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Segmented,
  Txt,
} from '@/components/ui';
import { jobTypeLabel, statusLabel, useAdminAiJobs } from '@/features/admin/admin-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { space } from '@/theme/tokens';

type Filter = 'FAILED' | 'RUNNING' | 'SUCCEEDED' | 'ALL';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'RUNNING', label: 'Đang chạy' },
  { value: 'SUCCEEDED', label: 'Xong' },
  { value: 'ALL', label: 'Tất cả' },
];

/** AI Job — mặc định lọc "Thất bại": việc admin cần làm trên điện thoại là xem và chạy lại job lỗi. */
export default function AdminAiJobsScreen() {
  const [filter, setFilter] = useState<Filter>('FAILED');
  const jobs = useAdminAiJobs(filter === 'ALL' ? undefined : filter);
  const list = jobs.data?.jobs ?? [];

  return (
    <Screen onRefresh={jobs.refetch}>
      <Segmented label="Lọc theo trạng thái" value={filter} options={FILTERS} onChange={setFilter} />

      {jobs.isLoading && <LoadingState rows={4} height={64} label="Đang tải AI Job" />}
      {jobs.isError && (
        <ErrorState
          title="Không tải được AI Job"
          description={errorText(jobs.error, 'Vui lòng thử lại.')}
          detail={errorDetail(jobs.error)}
          onRetry={() => void jobs.refetch()}
        />
      )}
      {jobs.data && list.length === 0 && (
        <EmptyState
          compact
          title={filter === 'FAILED' ? 'Không có job nào thất bại' : 'Không có job nào'}
          description="Đổi bộ lọc để xem các trạng thái khác."
        />
      )}
      {list.length > 0 && (
        <Card padded={false}>
          {list.map((j, i) => (
            <View key={j.id}>
              {i > 0 && <Divider />}
              <Card
                padded={false}
                style={styles.row}
                onPress={() => router.push(routes.adminAiJob(j.id))}
                accessibilityLabel={`${j.courseTitle}, ${jobTypeLabel(j.type)}, ${statusLabel(j.status)}`}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="smallStrong" numberOfLines={1}>
                    {j.courseTitle}
                  </Txt>
                  <Txt variant="caption" tone="subtle" numberOfLines={1}>
                    {jobTypeLabel(j.type)} · {j.requesterEmail} · {relativeTime(j.queuedAt)}
                  </Txt>
                </View>
                <Badge
                  label={statusLabel(j.status)}
                  tone={j.status === 'FAILED' ? 'strong' : 'neutral'}
                  icon={j.status === 'FAILED' ? 'alert' : j.status === 'SUCCEEDED' ? 'check' : undefined}
                />
              </Card>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 0,
    borderRadius: 0,
  },
});
