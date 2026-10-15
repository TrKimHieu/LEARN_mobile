import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, ErrorState, Icon, InlineError, Skeleton, Txt } from '@/components/ui';
import { errorDetail, errorText } from '@/lib/api-client';
import { humanizeCode } from '@/lib/format';
import { space } from '@/theme/tokens';
import { useCheckout, usePlans, useSubscription } from '../subscription-api';

const INTERVAL_LABEL: Record<string, string> = { month: 'tháng', year: 'năm', week: 'tuần', day: 'ngày' };

/** Các gói đăng ký và nút chọn gói. */
export function PlanList() {
  const plans = usePlans();
  const subscription = useSubscription();
  const checkout = useCheckout();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const currentCode = subscription.data?.planCode;

  async function upgrade(planCode: string) {
    setUpgradeError(null);
    setUpgrading(planCode);
    try {
      await checkout.mutateAsync(planCode);
    } catch (err) {
      setUpgradeError(errorText(err, 'Không nâng cấp được gói, vui lòng thử lại.'));
    } finally {
      setUpgrading(null);
    }
  }

  if (plans.isLoading) return <Skeleton height={260} />;

  if (plans.isError || !plans.data) {
    return (
      <ErrorState
        title="Không tải được danh sách gói"
        description={errorText(plans.error, 'Vui lòng thử lại.')}
        detail={errorDetail(plans.error)}
        onRetry={() => void plans.refetch()}
      />
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {upgradeError && <InlineError>{upgradeError}</InlineError>}
      {plans.data.map((plan) => {
        const current = plan.code === currentCode;
        return (
          <Card key={plan.code} emphasis={current ? 'strong' : plan.isFutureExtension ? 'dashed' : 'none'} style={{ gap: space.md }}>
            <View style={styles.head}>
              <Txt variant="heading" style={{ flex: 1 }}>
                {plan.name}
              </Txt>
              {plan.isFutureExtension && <Badge label="Mở rộng tương lai" tone="outline" />}
              {current && !plan.isFutureExtension && <Badge label="Đang dùng" icon="check" />}
            </View>
            {/* Gói "mở rộng tương lai" có priceCents = 0 làm chỗ giữ chỗ, không phải miễn phí. */}
            <Txt variant="title">
              {plan.isFutureExtension ? (
                <Txt variant="heading" tone="subtle">
                  Chưa công bố
                </Txt>
              ) : plan.priceCents === 0 ? (
                'Miễn phí'
              ) : (
                <>
                  ${(plan.priceCents / 100).toFixed(0)}
                  <Txt variant="small" tone="muted">
                    {' '}
                    / {INTERVAL_LABEL[plan.interval] ?? humanizeCode(plan.interval)}
                  </Txt>
                </>
              )}
            </Txt>
            <View style={{ gap: space.sm }}>
              {plan.features.map((f) => (
                <View key={f} style={styles.feature}>
                  <Icon name="check" size={16} />
                  <Txt variant="small" tone="muted" style={{ flex: 1 }}>
                    {f}
                  </Txt>
                </View>
              ))}
            </View>
            {current ? (
              <Txt variant="smallStrong" style={{ textAlign: 'center', paddingVertical: space.sm }}>
                Gói hiện tại
              </Txt>
            ) : plan.isFutureExtension ? (
              <Button label="Chưa mở bán" variant="secondary" disabled fullWidth />
            ) : (
              <Button
                label={upgrading === plan.code ? 'Đang xử lý…' : 'Chọn gói này'}
                variant={plan.priceCents > 0 ? 'primary' : 'secondary'}
                fullWidth
                loading={upgrading === plan.code}
                disabled={upgrading !== null && upgrading !== plan.code}
                onPress={() => void upgrade(plan.code)}
              />
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
