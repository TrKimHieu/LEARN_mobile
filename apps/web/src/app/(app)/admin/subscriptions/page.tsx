'use client';

import { useAdminSubscriptions } from '@/lib/admin-api';
import { StatusChip } from '@/components/admin/status-chip';
import {
  PageHeader,
  Table,
  TableCard,
  Tbody,
  Td,
  Th,
  TableEmpty,
  TableSkeleton,
  Thead,
} from '@/components/ui';
import { ErrorState } from '@/components/ui/states';
import { ApiClientError } from '@/lib/api-client';

export default function AdminSubscriptionsPage() {
  const subscriptions = useAdminSubscriptions();

  return (
    <section>
      <PageHeader title="Gói đăng ký" />

      {subscriptions.isLoading && <TableSkeleton columns={5} />}

      {subscriptions.isError && (
        <ErrorState
          title="Không tải được danh sách gói"
          description={
            subscriptions.error instanceof ApiClientError
              ? subscriptions.error.message
              : 'Vui lòng thử lại.'
          }
          onRetry={() => void subscriptions.refetch()}
        />
      )}

      {subscriptions.data && subscriptions.data.subscriptions.length === 0 && (
        <TableEmpty
          icon="star"
          title="Chưa có gói trả phí nào đang hoạt động"
          description="Mọi người dùng hiện đều ở gói Free. Không có việc gì phải làm ở đây."
        />
      )}

      {subscriptions.data && subscriptions.data.subscriptions.length > 0 && (
        <TableCard>
          <Table>
            <Thead>
              <Th>Email</Th>
              <Th>Gói</Th>
              <Th>Trạng thái</Th>
              <Th>Kết thúc kỳ</Th>
            </Thead>
            <Tbody>
              {subscriptions.data.subscriptions.map((s) => (
                <tr key={s.userId}>
                  <Td className="font-medium text-ink-900">{s.email}</Td>
                  <Td className="font-medium">{s.planCode}</Td>
                  <Td>
                    <StatusChip status={s.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-500">
                    {s.currentPeriodEnd
                      ? new Date(s.currentPeriodEnd).toLocaleDateString('vi-VN')
                      : '—'}
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        </TableCard>
      )}
    </section>
  );
}
