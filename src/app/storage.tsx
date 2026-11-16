import { View } from 'react-native';
import { Button, Card, Divider, EmptyState, ErrorState, InlineError, LoadingState, Screen, Txt } from '@/components/ui';
import { useDeleteSource, useLocalSources, type LocalSource } from '@/features/documents/source-files-api';
import { errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { formatSize } from '@/lib/format';
import { totalBytes } from '@/lib/source-files';
import { space } from '@/theme/tokens';

/** T1-9: bản sao tệp gốc trên máy. Xoá bản sao không xoá tài liệu hay bài học trên server. */
export default function StorageScreen() {
  const local = useLocalSources();
  const remove = useDeleteSource();
  const list = local.data ?? [];

  const onDelete = async (f: LocalSource) => {
    const ok = await confirmAction({
      title: 'Xoá bản gốc trên máy?',
      message: 'Tài liệu và bài học vẫn giữ nguyên. Bạn có thể gắn lại tệp sau.',
      confirmLabel: 'Xoá',
    });
    if (ok) remove.mutate(f);
  };

  return (
    <Screen width="reading" onRefresh={() => local.refetch()}>
      {local.isLoading ? (
        <LoadingState rows={3} height={56} label="Đang đọc dung lượng" />
      ) : local.error ? (
        <ErrorState title="Không đọc được dữ liệu trên máy" description={errorText(local.error, 'Vui lòng thử lại.')} onRetry={() => local.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="Chưa có tệp gốc nào trên máy" description="Tệp nhập từ điện thoại này sẽ được giữ ở đây." />
      ) : (
        <>
          <Txt variant="heading">Tổng {formatSize(totalBytes(list))} · {list.length} tệp</Txt>
          {remove.error && <InlineError>{errorText(remove.error, 'Không xoá được, vui lòng thử lại.')}</InlineError>}
          <Card padded={false}>
            {list.map((f, i) => (
              <View key={f.documentId}>
                {i > 0 && <Divider />}
                <View style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="smallStrong" numberOfLines={1}>{f.filename}</Txt>
                    <Txt variant="caption" tone="subtle">
                      {formatSize(f.sizeBytes)}
                      {f.status === 'missing' ? ' · Tệp không còn trên máy' : ''}
                    </Txt>
                  </View>
                  <Button
                    label="Xoá"
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    accessibilityLabel={`Xoá bản gốc ${f.filename}`}
                    loading={remove.isPending && remove.variables?.documentId === f.documentId}
                    onPress={() => void onDelete(f)}
                  />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
