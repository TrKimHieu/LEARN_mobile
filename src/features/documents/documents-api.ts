import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { DOCUMENT_TYPES, mimeFromFilename, type UploadUrlResponse } from '@/contracts';
import { apiFetch } from '@/lib/api-client';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Byte của tệp đã chọn + thứ để PUT lên storage — native dùng `File` của expo-file-system. */
async function readPicked(asset: DocumentPickerAsset): Promise<{ bytes: Uint8Array; body: Blob }> {
  if (Platform.OS === 'web' && asset.file) {
    return { bytes: new Uint8Array(await asset.file.arrayBuffer()), body: asset.file };
  }
  const file = new File(asset.uri);
  return { bytes: await file.bytes(), body: file };
}

/**
 * Xin URL upload → PUT thẳng lên S3/MinIO → xác nhận — cùng luồng với web (HANDBOOK §7.2).
 *
 * Presigned URL mang host do API ký (`S3_PUBLIC_ENDPOINT`), nên điện thoại chỉ PUT được khi host
 * đó tới được từ mạng của nó — xem docs/getting-started.md, mục "Tải tài liệu lên từ điện thoại".
 */
export function useUploadDocument(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (asset: DocumentPickerAsset) => {
      // MIME theo đuôi, không theo mimeType của hệ điều hành (Android hay khai sai .md/.txt).
      const mimeType = mimeFromFilename(asset.name);
      if (!mimeType) {
        throw new Error(
          `Chưa hỗ trợ loại tệp này. Chỉ nhận ${DOCUMENT_TYPES.map((t) => t.label).join(', ')}.`,
        );
      }
      const { bytes, body } = await readPicked(asset);
      const checksumSha256 = toHex(
        await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes)),
      );

      const { documentId, uploadUrl } = await apiFetch<UploadUrlResponse>(
        `/api/v1/courses/${courseId}/documents/upload-url`,
        {
          method: 'POST',
          body: { filename: asset.name, mimeType, sizeBytes: bytes.byteLength, checksumSha256 },
        },
      );

      // Presigned URL được ký kèm Content-Type và Content-Length — gửi đúng hai giá trị đó.
      let putRes: Response;
      try {
        putRes = (await expoFetch(uploadUrl, {
          method: 'PUT',
          body,
          headers: { 'Content-Type': mimeType },
        })) as unknown as Response;
      } catch {
        throw new Error(
          'Không tới được kho lưu trữ tài liệu. Máy chủ cần đặt S3_PUBLIC_ENDPOINT theo IP mạng LAN.',
        );
      }
      if (!putRes.ok) throw new Error(`Tải file lên storage thất bại (${putRes.status}).`);

      await apiFetch(`/api/v1/documents/${documentId}/confirm`, {
        method: 'POST',
        body: { sizeBytes: bytes.byteLength },
      });
      return documentId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'documents'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
