import { StyleSheet, View } from 'react-native';
import type { DocumentList as DocumentItem } from '@/contracts';
import { Badge, Card, Divider, ErrorState, Icon, InlineError, LoadingState, Txt } from '@/components/ui';
import { errorText } from '@/lib/api-client';
import { formatSize, humanizeCode, relativeTime } from '@/lib/format';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ tải lên',
  UPLOADED: 'Đã tải lên',
  EXTRACTING: 'Đang trích xuất',
  EXTRACTED: 'Đã trích xuất',
  FAILED: 'Lỗi',
};

/**
 * Danh sách tài liệu của khóa kèm trạng thái trích xuất. Màn truyền kết quả query vào (query thuộc
 * `courses-api`, cùng key với web) để màn và danh sách dùng chung một nguồn.
 */
export function DocumentList({
  documents,
  isLoading,
  error,
  onRetry,
}: {
  documents: DocumentItem[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isLoading) return <LoadingState rows={2} height={56} label="Đang tải tài liệu" />;
  if (error) {
    return <ErrorState title="Không tải được tài liệu" description={errorText(error, 'Vui lòng thử lại.')} onRetry={onRetry} />;
  }
  if (!documents) return null;
  if (documents.length === 0) {
    return (
      <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
        Chưa có tài liệu nào trong khóa này.
      </Txt>
    );
  }
  return (
    <Card padded={false}>
      {documents.map((doc, i) => (
        <View key={doc.id}>
          {i > 0 && <Divider />}
          <DocumentRow doc={doc} />
        </View>
      ))}
    </Card>
  );
}

function DocumentRow({ doc }: { doc: DocumentItem }) {
  const p = usePalette();
  const failed = doc.status === 'FAILED';
  return (
    <View style={{ padding: space.md, gap: space.sm }}>
      <View style={styles.row}>
        <Icon name="file" size={20} color={failed ? p.fg : p.fgSubtle} />
        <View style={{ flex: 1 }}>
          <Txt variant="smallStrong" numberOfLines={1}>
            {doc.filename}
          </Txt>
          <Txt variant="caption" tone="subtle">
            {formatSize(doc.sizeBytes)}
            {doc.pageCount ? ` · ${doc.pageCount} trang` : ''}
            {doc.createdAt ? ` · ${relativeTime(doc.createdAt)}` : ''}
          </Txt>
        </View>
        <Badge
          label={STATUS_LABEL[doc.status] ?? humanizeCode(doc.status)}
          tone={failed ? 'strong' : doc.status === 'EXTRACTED' ? 'neutral' : 'outline'}
          icon={failed ? 'alert' : doc.status === 'EXTRACTED' ? 'check' : undefined}
        />
      </View>
      {failed && doc.errorMessage && <InlineError>{doc.errorMessage}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
