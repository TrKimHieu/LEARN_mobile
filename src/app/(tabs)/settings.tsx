import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  Icon,
  InlineError,
  Notice,
  PageHeader,
  ProgressBar,
  Screen,
  SectionTitle,
  Segmented,
  Skeleton,
  Txt,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  useCancelSubscription,
  useCheckout,
  usePlans,
  useSubscription,
} from '@/features/settings/subscription-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { config } from '@/lib/config';
import { confirmAction } from '@/lib/dialog';
import { APP_VERSION, useServerMeta } from '@/lib/server-meta';
import { dateLabel, humanizeCode } from '@/lib/format';
import { usePalette, useTheme, type ThemePreference } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

/** Nhãn tiếng Việt cho enum của API — không đổ mã máy ra màn hình (NN/g H2). */
const STATUS_LABEL: Record<string, string> = {
  TRIALING: 'Đang dùng thử',
  ACTIVE: 'Đang hoạt động',
  PAST_DUE: 'Quá hạn thanh toán',
  CANCELED: 'Đã huỷ',
};
const INTERVAL_LABEL: Record<string, string> = { month: 'tháng', year: 'năm', week: 'tuần', day: 'ngày' };
const METRIC_LABEL: Record<string, string> = {
  COURSES_CREATED: 'Khóa học',
  DOCUMENTS_UPLOADED: 'Tài liệu / tháng',
  PAGES_PROCESSED: 'Trang / tài liệu',
  AI_JOBS_RUN: 'AI Job / tháng',
};
const ROLE_LABEL: Record<string, string> = { LEARNER: 'Người học', ADMIN: 'Quản trị viên' };

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Tự động' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

export default function SettingsScreen() {
  const { user, logout, logoutAll } = useAuth();
  const { preference, setPreference } = useTheme();
  const plans = usePlans();
  const subscription = useSubscription();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const { meta, contractsDiffer } = useServerMeta();
  const [actionError, setActionError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const sub = subscription.data;

  async function upgrade(planCode: string) {
    setActionError(null);
    setUpgrading(planCode);
    try {
      await checkout.mutateAsync(planCode);
    } catch (err) {
      setActionError(errorText(err, 'Không nâng cấp được gói, vui lòng thử lại.'));
    } finally {
      setUpgrading(null);
    }
  }

  // Huỷ gói, đăng xuất mọi thiết bị: xác nhận hai nhịp — cùng mẫu với "Xoá bài học".
  async function confirmCancel() {
    const ok = await confirmAction({
      title: 'Huỷ gói này?',
      message: 'Gói vẫn dùng được tới hết kỳ hiện tại.',
      confirmLabel: 'Huỷ gói',
      cancelLabel: 'Không huỷ',
    });
    if (!ok) return;
    setActionError(null);
    try {
      await cancel.mutateAsync();
    } catch (err) {
      setActionError(errorText(err, 'Không huỷ được gói, vui lòng thử lại.'));
    }
  }

  async function confirmLogoutAll() {
    const ok = await confirmAction({
      title: 'Đăng xuất mọi thiết bị?',
      message: 'Mọi trình duyệt và điện thoại đang đăng nhập sẽ phải đăng nhập lại.',
      confirmLabel: 'Đăng xuất hết',
      cancelLabel: 'Không',
    });
    if (ok) await logoutAll();
  }

  return (
    <Screen topInset onRefresh={() => Promise.all([plans.refetch(), subscription.refetch()])}>
      <PageHeader title="Cài đặt" description="Hồ sơ, giao diện, gói đăng ký và hạn mức sử dụng." />

      <Card style={{ gap: space.lg }}>
        <View style={styles.profile}>
          <Avatar name={user?.displayName} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="heading" numberOfLines={1}>
              {user?.displayName}
            </Txt>
            <Txt variant="small" tone="subtle" numberOfLines={1}>
              {user?.email}
            </Txt>
            {user?.role && (
              <View style={{ marginTop: 4 }}>
                <Badge
                  label={ROLE_LABEL[user.role] ?? humanizeCode(user.role)}
                  icon={user.role === 'ADMIN' ? 'shield' : 'user'}
                />
              </View>
            )}
          </View>
        </View>
        <Divider />
        <View style={{ gap: space.sm }}>
          <Button label="Đăng xuất" icon="logout" variant="secondary" fullWidth onPress={() => void logout()} />
          <Button label="Đăng xuất mọi thiết bị" variant="ghost" fullWidth onPress={() => void confirmLogoutAll()} />
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Txt variant="heading">Giao diện</Txt>
        <Txt variant="small" tone="subtle">
          &quot;Tự động&quot; theo chế độ sáng/tối của điện thoại. Lựa chọn được lưu trên máy này.
        </Txt>
        <Segmented label="Giao diện" value={preference} options={THEMES} onChange={setPreference} />
      </Card>

      <View>
        <SectionTitle title="Gói hiện tại" />
        {subscription.isLoading && <Skeleton height={200} />}
        {!subscription.isLoading && (subscription.isError || !sub) && (
          <ErrorState
            title="Không tải được thông tin gói hiện tại"
            description={errorText(subscription.error, 'Vui lòng thử lại.')}
            detail={errorDetail(subscription.error)}
            onRetry={() => void subscription.refetch()}
          />
        )}
        {sub && (
          <View style={{ gap: space.md }}>
            {sub.billingMode === 'demo' && (
              <Notice>
                <Txt variant="small">
                  <Txt variant="smallStrong">Chế độ demo:</Txt> nâng cấp gói ở đây không phát sinh giao dịch thật,
                  chỉ để minh hoạ luồng sản phẩm.
                </Txt>
              </Notice>
            )}
            <Card padded={false}>
              <View style={[styles.planHead, { padding: space.lg }]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="small" tone="subtle">
                    Gói của bạn
                  </Txt>
                  <Txt variant="title">{sub.planCode}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge
                    label={STATUS_LABEL[sub.status] ?? humanizeCode(sub.status)}
                    icon={sub.status === 'ACTIVE' ? 'check' : undefined}
                  />
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
          </View>
        )}
        {actionError && <InlineError style={{ marginTop: space.md }}>{actionError}</InlineError>}
      </View>

      <View>
        <SectionTitle title="Các gói" />
        {plans.isLoading && <Skeleton height={260} />}
        {!plans.isLoading && (plans.isError || !plans.data) && (
          <ErrorState
            title="Không tải được danh sách gói"
            description={errorText(plans.error, 'Vui lòng thử lại.')}
            detail={errorDetail(plans.error)}
            onRetry={() => void plans.refetch()}
          />
        )}
        {plans.data && (
          <View style={{ gap: space.md }}>
            {plans.data.map((plan) => {
              const current = sub ? plan.code === sub.planCode : false;
              return (
                <Card
                  key={plan.code}
                  emphasis={current ? 'strong' : plan.isFutureExtension ? 'dashed' : 'none'}
                  style={{ gap: space.md }}
                >
                  <View style={styles.planHead}>
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
        )}
      </View>

      <View style={{ gap: 2 }}>
        <Txt variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
          Ứng dụng {APP_VERSION} · Máy chủ {config.apiUrl}
        </Txt>
        {/* Chỉ người phát triển cần biết schema lệch — xem `npm run sync:contracts`. */}
        {__DEV__ && contractsDiffer && meta && (
          <Txt variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
            Contracts khác máy chủ ({meta.contractsHash})
          </Txt>
        )}
      </View>
    </Screen>
  );
}

function Avatar({ name }: { name?: string }) {
  const p = usePalette();
  const initial = (name?.trim().split(/\s+/).pop() ?? '?').charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: p.primary }]}>
      <Txt variant="title" tone="inverse">
        {initial}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
