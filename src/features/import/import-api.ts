import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentList, ImportTextDocumentInput } from '@/contracts';
import { apiFetch } from '@/lib/api-client';

/** Gửi văn bản đã trích tại máy; không có tệp gốc nào đi theo. */
export function useImportText(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportTextDocumentInput) =>
      apiFetch<DocumentList>(`/api/v1/courses/${courseId}/documents/text`, { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses', courseId, 'documents'] }),
  });
}
