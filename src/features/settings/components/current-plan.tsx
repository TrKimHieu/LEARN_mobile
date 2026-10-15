import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, Divider, ErrorState, Icon, InlineError, Notice, ProgressBar, Skeleton, Txt } from '@/components/ui';
import { errorDetail, errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { dateLabel, humanizeCode } from '@/lib/format';
import { space } from '@/theme/tokens';
import { useCancelSubscription, useSubscription } from '../subscription-api';

/** Nhãn tiếng Việt cho enum của API — không đổ mã máy ra màn hình (NN/g H2). */
const STATUS_LABEL: Record<string, string> = {
  TRIALING: 'Đang dùng thử',
  ACTIVE: 'Đang hoạt động',
  PAST_DUE: 'Quá hạn thanh toán',
  CANCELED: 'Đã huỷ',
};
const METRIC_LABEL: Record<string, string> = {
  COURSES_CREATED: 'Khóa học',
  DOCUMENTS_UPLOADED: 'Tài liệu / tháng',
  PAGES_PROCESSED: 'Trang / tài liệu',
  AI_JOBS_RUN: 'AI Job / tháng',
};

/** Gói đang dùng, hạn mức đã dùng và nút huỷ gói. */
export function CurrentPlan() {
  const subscription = useSubscription();
  const cancel = useCancelSubscription();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const sub = subscription.data;

  // Huỷ gói: xác nhận hai nhịp — cùng mẫu với "Xoá bài học".
  async function confirmCancel() {
    const ok = await confirmAction({
      title: 'Huỷ gói này?',
      message: 'Gói vẫn dùng được tới hết kỳ hiện tại.',
      confirmLabel: 'Huỷ gói',
      cancelLabel: 'Không huỷ',
    });
    if (!ok) return;
    setCancelError(null);
    try {
      await cancel.mutateAsync();
    } catch (err) {
      setCancelError(errorText(err, 'Không huỷ được gói, vui lòng thử lại.'));
    }
  }

  if (subscription.isLoading) return <Skeleton height={200} />;

  if (subscription.isError || !sub) {
    return (
      <ErrorState
        title="Không tải được thông tin gói hiện tại"
        description={errorText(subscription.error, 'Vui lòng thử lại.')}
        detail={errorDetail(subscription.error)}
        onRetry={() => void subscription.refetch()}
      />
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {sub.billingMode === 'demo' && (
        <Notice>
          <Txt variant="small">
            <Txt variant="smallStrong">Chế độ demo:</Txt> nâng cấp gói ở đây không phát sinh giao dịch thật, chỉ để
            minh hoạ luồng sản phẩm.
          </Txt>
        </Notice>
      )}
      <Card padded={false}>
        <View style={[styles.head, { padding: space.lg }]}>
          <View style={{ flex: 1 }}>
            <Txt variant="small" tone="subtle">
              Gói của bạn
            </Txt>
            <Txt variant="title">{sub.planCode}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge label={STATUS_LABEL[sub.status] ?? humanizeCode(sub.status)} icon={sub.status === 'ACTIVE' ? 'check' : undefined} />
            {sub.currentPeriodEnd && (
              <Txt variant="caption" tone="subtle">
                {sub.cancelAtPeriodEnd ? 'Huỷ vào' : 'Gia hạn vào'} {dateLabel(sub.currentPeriodEnd)}
              </Txt>
            )}
          </View>
        </View>
        <Divider />
        <View style={{ padding: space.lg, gap: space.lg }}>
          {Object.entries(sub.usage).map(([metric, u]) => {
            const atLimit = u.limit !== null && u.used >= u.limit;
            const name = METRIC_LABEL[metric] ?? humanizeCode(metric);
            return (
              <View key={metric} style={{ gap: 6 }}>
                <View style={styles.usageHead}>
                  <Txt variant="smallStrong" tone="muted">
                    {name}
                  </Txt>
                  <Txt variant="caption" tone={atLimit ? 'fg' : 'subtle'} style={{ fontVariant: ['tabular-nums'] }}>
                    {u.used}
                    {u.limit !== null ? ` / ${u.limit}` : ' · không giới hạn'}
                  </Txt>
                </View>
                {u.limit !== null && <ProgressBar value={u.used} max={u.limit} label={`${name}: ${u.used} trên ${u.limit}`} />}
                {atLimit && (
                  <View style={styles.inlineRow}>
                    <Icon name="alert" size={12} />
                    <Txt variant="caption">Đã chạm hạn mức</Txt>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        {sub.planCode !== 'FREE' && !sub.cancelAtPeriodEnd && (
          <>
            <Divider />
            <View style={{ padding: space.md }}>
              <Button
                label={cancel.isPending ? 'Đang huỷ…' : 'Huỷ gói (hiệu lực cuối kỳ)'}
                variant="ghost"
                size="sm"
                loading={cancel.isPending}
                onPress={() => void confirmCancel()}
              />
            </View>
          </>
        )}
        {sub.cancelAtPeriodEnd && (
          <>
            <Divider />
            <Txt variant="small" tone="subtle" style={{ padding: space.lg }}>
              Gói sẽ huỷ ở cuối kỳ hiện tại.
            </Txt>
          </>
        )}
      </Card>
      {cancelError && <InlineError>{cancelError}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
