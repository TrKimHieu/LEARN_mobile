import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { DOCUMENT_TYPES } from '@/contracts';
import { Button, Card, Icon, InlineError, QuotaNotice, Txt } from '@/components/ui';
import { errorText, isQuotaExceededError } from '@/lib/api-client';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { useUploadDocument } from '../documents-api';

/** MIME cho trình chọn tệp — thêm octet-stream vì Android hay khai .md/.docx như vậy; đuôi tệp mới quyết định. */
const PICKER_TYPES = [
  ...new Set([...DOCUMENT_TYPES.flatMap((t) => [t.mime, ...t.aliases]), 'application/octet-stream']),
];

/** Vùng chọn và tải tài liệu lên khóa học. */
export function DocumentUpload({ courseId }: { courseId: string }) {
  const p = usePalette();
  const upload = useUploadDocument(courseId);
  const [error, setError] = useState<unknown>(null);

  async function pickAndUpload() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({ type: PICKER_TYPES, copyToCacheDirectory: true });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    try {
      await upload.mutateAsync(asset);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <Card style={{ alignItems: 'center', gap: space.sm, borderStyle: 'dashed', borderColor: p.lineInput }}>
        <Icon name="upload" size={22} color={p.fgSubtle} />
        <Txt variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
          PDF có lớp chữ, Word (DOCX), PowerPoint (PPTX), TXT, Markdown. PDF scan chưa đọc được.
        </Txt>
        <Button
          label={upload.isPending ? 'Đang tải lên…' : 'Chọn tệp để tải lên'}
          icon="plus"
          variant="secondary"
          loading={upload.isPending}
          onPress={() => void pickAndUpload()}
        />
      </Card>

      {isQuotaExceededError(error) && (
        <QuotaNotice metric={error.meta.metric} limit={error.meta.limit} used={error.meta.used} style={{ marginTop: space.md }} />
      )}
      {Boolean(error) && !isQuotaExceededError(error) && (
        <InlineError style={{ marginTop: space.md }}>{errorText(error, 'Tải tài liệu thất bại, vui lòng thử lại.')}</InlineError>
      )}
    </>
  );
}
