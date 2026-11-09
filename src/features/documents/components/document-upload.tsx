import { Notice, Txt } from '@/components/ui';
import { NEW_IMPORT_DISABLED_MESSAGE } from '../documents-api';

/** New original-file upload stays locked until on-device extraction is available. */
export function DocumentUpload(_props: { courseId: string }) {
  return (
    <Notice icon="info">
      <Txt variant="small">{NEW_IMPORT_DISABLED_MESSAGE}</Txt>
    </Notice>
  );
}
