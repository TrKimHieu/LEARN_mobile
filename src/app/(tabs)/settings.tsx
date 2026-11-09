import { View } from 'react-native';
import { PageHeader, Screen, SectionTitle, Txt } from '@/components/ui';
import { ProfileCard } from '@/features/auth/components/profile-card';
import { CurrentPlan } from '@/features/settings/components/current-plan';
import { PlanList } from '@/features/settings/components/plan-list';
import { ThemePicker } from '@/features/settings/components/theme-picker';
import { usePlans, useSubscription } from '@/features/settings/subscription-api';
import { config } from '@/lib/config';
import { APP_VERSION, useServerMeta } from '@/lib/server-meta';

export default function SettingsScreen() {
  // Chỉ để kéo-làm-mới; các thẻ bên dưới tự dùng cùng query (TanStack Query gộp request).
  const plans = usePlans();
  const subscription = useSubscription();
  const { meta, contractsDiffer } = useServerMeta();

  return (
    <Screen width="reading" topInset onRefresh={() => Promise.all([plans.refetch(), subscription.refetch()])}>
      <PageHeader title="Cài đặt" description="Hồ sơ, giao diện, gói đăng ký và hạn mức sử dụng." />

      <ProfileCard />
      <ThemePicker />

      <View>
        <SectionTitle title="Gói hiện tại" />
        <CurrentPlan />
      </View>

      <View>
        <SectionTitle title="Các gói" />
        <PlanList />
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
