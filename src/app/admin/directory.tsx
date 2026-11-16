import { useState } from 'react';
import { View } from 'react-native';
import {
  Badge, Card, Divider, EmptyState, ErrorState, Field, LoadingState, Screen, Segmented, Txt,
} from '@/components/ui';
import { useAdminCourses, useAdminSubscriptions, useAdminUsers } from '@/features/admin/admin-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { space } from '@/theme/tokens';

type Tab = 'users' | 'courses' | 'subscriptions';
const TABS = [
  { value: 'users', label: 'Người dùng' },
  { value: 'courses', label: 'Khóa học' },
  { value: 'subscriptions', label: 'Gói' },
] as const;

const COURSE_STATUS: Record<string, string> = { DRAFT: 'Nháp', READY: 'Sẵn sàng', ARCHIVED: 'Đã lưu trữ' };
const SUB_STATUS: Record<string, string> = {
  TRIALING: 'Đang dùng thử', ACTIVE: 'Đang hoạt động', PAST_DUE: 'Quá hạn thanh toán', CANCELED: 'Đã huỷ',
};

/** W6: người dùng, khóa học, gói trả phí — chỉ xem, như web. Quyền ADMIN do server kiểm. */
export default function AdminDirectoryScreen() {
  const [tab, setTab] = useState<Tab>('users');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const users = useAdminUsers(tab === 'users' ? q : undefined);
  const courses = useAdminCourses(tab === 'courses' ? q : undefined);
  const subs = useAdminSubscriptions();
  const active = tab === 'users' ? users : tab === 'courses' ? courses : subs;

  const rows: { id: string; title: string; sub: string; badge?: string }[] =
    tab === 'users'
      ? (users.data?.users ?? []).map((u) => ({
          id: u.id,
          title: u.displayName || u.email,
          sub: `${u.email} · ${u.courseCount} khóa · ${u.subscriptionCode ?? 'Không có gói'} · tạo ${relativeTime(u.createdAt)}`,
          badge: u.role === 'ADMIN' ? 'Quản trị viên' : undefined,
        }))
      : tab === 'courses'
        ? (courses.data?.courses ?? []).map((c) => ({
            id: c.id,
            title: c.title,
            sub: `${c.ownerEmail} · ${c.lessonCount} bài · ${c.documentCount} tài liệu · cập nhật ${relativeTime(c.updatedAt)}`,
            badge: COURSE_STATUS[c.status],
          }))
        : (subs.data?.subscriptions ?? []).map((s) => ({
            id: s.userId,
            title: s.email,
            sub: `${s.planCode}${s.currentPeriodEnd ? ` · kết thúc kỳ ${relativeTime(s.currentPeriodEnd)}` : ''}`,
            badge: SUB_STATUS[s.status],
          }));

  return (
    <Screen onRefresh={() => active.refetch()}>
      <Segmented label="Danh mục" value={tab} options={TABS} onChange={(v) => { setTab(v); setDraft(''); setQ(''); }} />
      {tab !== 'subscriptions' && (
        <Field
          label={tab === 'users' ? 'Tìm theo email' : 'Tìm theo tên khóa học'}
          value={draft}
          onChangeText={setDraft}
          returnKeyType="search"
          autoCapitalize="none"
          onSubmitEditing={() => setQ(draft.trim())}
        />
      )}
      {active.isLoading && <LoadingState rows={4} height={64} label="Đang tải" />}
      {active.isError && (
        <ErrorState
          title="Không tải được danh sách"
          description={errorText(active.error, 'Vui lòng thử lại.')}
          detail={errorDetail(active.error)}
          onRetry={() => void active.refetch()}
        />
      )}
      {active.data && rows.length === 0 && (
        <EmptyState
          compact
          title={q ? `Không có kết quả khớp "${q}"` : tab === 'subscriptions' ? 'Chưa có gói trả phí nào đang hoạt động' : 'Chưa có dữ liệu'}
          description={q ? 'Thử một phần của từ khoá, hoặc xoá ô tìm.' : 'Dữ liệu sẽ xuất hiện khi có người dùng.'}
        />
      )}
      {rows.length > 0 && (
        <Card padded={false}>
          {rows.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <Divider />}
              <View style={{ padding: space.md, gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Txt variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>{r.title}</Txt>
                  {r.badge && <Badge label={r.badge} tone="outline" />}
                </View>
                <Txt variant="caption" tone="subtle">{r.sub}</Txt>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
