import { useMutation } from '@tanstack/react-query';

export const NEW_IMPORT_DISABLED_MESSAGE =
  'Nhập tài liệu mới đang tạm khóa để chuyển sang xử lý trên thiết bị. Bạn vẫn có thể đọc tài liệu và bài học đã có.';

/** Defense in depth: no file reads, upload URLs or PUTs until the text-only pipeline ships. */
export function useUploadDocument(_courseId: string) {
  return useMutation({
    mutationFn: async (_asset: unknown): Promise<string> => {
      throw new Error(NEW_IMPORT_DISABLED_MESSAGE);
    },
  });
}
