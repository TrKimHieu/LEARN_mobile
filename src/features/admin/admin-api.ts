import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAiJobDetail, AdminAiJobList, AdminCourse, AdminMetrics, AdminSubscription, AdminUser, AuditLogEntry,
} from '@/contracts';
import { apiFetch } from '@/lib/api-client';
import { humanizeCode } from '@/lib/format';

/**
 * Quản trị bản rút gọn (chỉ ADMIN) — port một phần `apps/web/src/features/admin/admin-api.ts`,
 * cùng endpoint và query key. Server chặn thật bằng `RolesGuard`; app chỉ ẩn giao diện.
 */
export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => apiFetch<AdminMetrics>('/api/v1/admin/metrics'),
  });
}

export function useAdminAiJobs(status?: string) {
  return useQuery({
    queryKey: ['admin', 'ai-jobs', status ?? ''],
    queryFn: () =>
      apiFetch<{ jobs: AdminAiJobList[] }>(`/api/v1/admin/ai-jobs${status ? `?status=${status}` : ''}`),
  });
}

export function useAdminAiJobDetail(jobId: string) {
  return useQuery({
    queryKey: ['admin', 'ai-jobs', jobId],
    queryFn: () => apiFetch<AdminAiJobDetail>(`/api/v1/admin/ai-jobs/${jobId}`),
    enabled: Boolean(jobId),
  });
}

export function useAiJobAuditLog(jobId: string) {
  return useQuery({
    queryKey: ['admin', 'ai-jobs', jobId, 'audit-log'],
    queryFn: () => apiFetch<{ entries: AuditLogEntry[] }>(`/api/v1/admin/ai-jobs/${jobId}/audit-log`),
    enabled: Boolean(jobId),
  });
}

export function useRetryAiJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<AdminAiJobList>(`/api/v1/admin/ai-jobs/${jobId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ai-jobs'] });
    },
  });
}

/** Nhãn — chép từ `apps/web/src/features/admin/status-chip.tsx` (không đổ enum thô ra màn hình). */
const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Đang chờ',
  RUNNING: 'Đang chạy',
  SUCCEEDED: 'Thành công',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
};
const JOB_TYPE_LABELS: Record<string, string> = {
  EXTRACT_DOCUMENT: 'Trích xuất tài liệu',
  GENERATE_LESSONS: 'Sinh bài học',
  REGENERATE_LESSON: 'Sinh lại một bài',
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? humanizeCode(status);
}

export function jobTypeLabel(type: string) {
  return JOB_TYPE_LABELS[type] ?? humanizeCode(type);
}

// ── W6: danh bạ quản trị (cùng endpoint và khóa cache với web) ──
export function useAdminUsers(q?: string) {
  return useQuery({
    queryKey: ['admin', 'users', q ?? ''],
    queryFn: () => apiFetch<{ users: AdminUser[] }>(`/api/v1/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
}

export function useAdminCourses(q?: string) {
  return useQuery({
    queryKey: ['admin', 'courses', q ?? ''],
    queryFn: () => apiFetch<{ courses: AdminCourse[] }>(`/api/v1/admin/courses${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => apiFetch<{ subscriptions: AdminSubscription[] }>('/api/v1/admin/subscriptions'),
  });
}
