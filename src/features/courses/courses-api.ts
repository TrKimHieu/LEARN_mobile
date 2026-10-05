import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CourseDetail, CourseSummary, CreateCourseInput, DocumentList } from '@/contracts';
import { apiFetch } from '@/lib/api-client';

/** Query key trùng với web (`apps/web/src/features/courses/courses-api.ts`) để dễ đối chiếu. */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => apiFetch<{ courses: CourseSummary[] }>('/api/v1/workspace'),
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId],
    queryFn: () => apiFetch<CourseDetail>(`/api/v1/courses/${courseId}`),
    enabled: Boolean(courseId),
  });
}

// Không gồm PENDING: tài liệu xin URL rồi bỏ dở nằm PENDING mãi — hỏi lại sẽ không bao giờ dừng.
const PROCESSING = new Set(['UPLOADED', 'EXTRACTING']);

/**
 * Tài liệu của khóa. Khác web: tự hỏi lại mỗi 3 giây khi còn tài liệu đang trích xuất, để trạng
 * thái "Đang trích xuất → Đã trích xuất" tự đổi — trên điện thoại không có thói quen tải lại trang.
 */
export function useCourseDocuments(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'documents'],
    queryFn: () => apiFetch<{ documents: DocumentList[] }>(`/api/v1/courses/${courseId}/documents`),
    enabled: Boolean(courseId),
    refetchInterval: (query) =>
      query.state.data?.documents.some((d) => PROCESSING.has(d.status)) ? 3000 : false,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourseInput) =>
      apiFetch<CourseDetail>('/api/v1/courses', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
