import { StyleSheet, View } from 'react-native';
import type { DocumentList as DocumentItem } from '@/contracts';
import { Badge, Button, Card, Divider, ErrorState, Icon, InlineError, LoadingState, Txt } from '@/components/ui';
import { confirmAction } from '@/lib/dialog';
import { useDeleteDocument, useLocalSources, useReattachSource, type LocalSource } from '../source-files-api';
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
  return <DocumentCard documents={documents} />;
}

function DocumentCard({ documents }: { documents: DocumentItem[] }) {
  const local = useLocalSources();
  const byId = new Map((local.data ?? []).map((s) => [s.documentId, s]));
  return (
    <Card padded={false}>
      {documents.map((doc, i) => (
        <View key={doc.id}>
          {i > 0 && <Divider />}
          <DocumentRow doc={doc} source={byId.get(doc.id)} />
        </View>
      ))}
    </Card>
  );
}

/** Tài liệu nhập từ máy này có chỉ mục bản sao; tài liệu cũ hoặc từ web thì không có dòng này (T1-10). */
function SourceLine({ source }: { source: LocalSource }) {
  const reattach = useReattachSource();
  if (source.status === 'present') {
    return (
      <Txt variant="caption" tone="subtle">
        Bản gốc đang lưu trên máy này · {formatSize(source.sizeBytes)}
      </Txt>
    );
  }
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="caption" tone="subtle">
        Tệp gốc không còn trên máy này. Văn bản đã trích vẫn dùng được.
      </Txt>
      <Button
        label="Gắn lại tệp"
        variant="secondary"
        size="sm"
        icon="upload"
        loading={reattach.isPending}
        onPress={() => reattach.mutate(source)}
        style={{ alignSelf: 'flex-start' }}
      />
      {reattach.error && <InlineError>{errorText(reattach.error, 'Không gắn lại được tệp.')}</InlineError>}
    </View>
  );
}

function DocumentRow({ doc, source }: { doc: DocumentItem; source?: LocalSource }) {
  const p = usePalette();
  const failed = doc.status === 'FAILED';
  const remove = useDeleteDocument();
  const onDelete = async () => {
    const ok = await confirmAction({
      title: 'Xoá tài liệu này?',
      message: 'Tài liệu và bản gốc lưu trên máy (nếu có) sẽ bị xoá.',
      confirmLabel: 'Xoá',
    });
    if (ok) remove.mutate(doc.id);
  };
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
      {source && <SourceLine source={source} />}
      <Button
        label="Xoá tài liệu"
        variant="ghost"
        size="sm"
        icon="trash"
        accessibilityLabel={`Xoá tài liệu ${doc.filename}`}
        loading={remove.isPending}
        onPress={() => void onDelete()}
        style={{ alignSelf: 'flex-start' }}
      />
      {remove.error && <InlineError>{errorText(remove.error, 'Không xoá được tài liệu, vui lòng thử lại.')}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
