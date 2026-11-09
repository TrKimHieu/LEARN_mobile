import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Field, Icon, InlineError, Notice, Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import type { ExtractedPage } from '../extract/types';

/** Xem và sửa văn bản đã trích trước khi gửi. */
export function ImportReview({
  filename,
  onFilename,
  pages,
  onPageText,
  chars,
  skippedPages,
  error,
  sending,
  canSend,
  onSend,
  onCancel,
}: {
  filename: string;
  onFilename: (v: string) => void;
  pages: ExtractedPage[];
  onPageText: (i: number, text: string) => void;
  chars: number;
  skippedPages: number;
  error: string | null;
  sending: boolean;
  canSend: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={{ gap: space.md }}>
      <Field label="Tên tài liệu" value={filename} onChangeText={onFilename} maxLength={255} />
      {skippedPages > 0 && (
        <Notice icon="alert">
          <Txt variant="small">
            Bỏ qua {skippedPages} trang quét vì bản này chưa có nhận dạng chữ. Cài bản đầy đủ để nhập các trang đó.
          </Txt>
        </Notice>
      )}
      {pages.map((p, i) => (
        <PageEditor key={`${p.page ?? 'all'}-${i}`} page={p} initialOpen={pages.length === 1} onChange={(t) => onPageText(i, t)} />
      ))}
      <Txt variant="caption" tone="subtle">
        {chars.toLocaleString('vi-VN')} ký tự
      </Txt>
      {error && <InlineError>{error}</InlineError>}
      <View style={{ gap: space.sm }}>
        <Button label="Gửi văn bản" onPress={onSend} disabled={!canSend} loading={sending} fullWidth />
        <Button label="Huỷ" variant="ghost" onPress={onCancel} disabled={sending} fullWidth />
      </View>
    </View>
  );
}

function PageEditor({
  page,
  initialOpen,
  onChange,
}: {
  page: ExtractedPage;
  initialOpen: boolean;
  onChange: (t: string) => void;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(initialOpen);
  const title = page.page == null ? 'Nội dung' : `Trang ${page.page}`;
  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen((v) => !v)}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md }}
      >
        <Txt variant="smallStrong" style={{ flex: 1 }}>
          {title}
        </Txt>
        <Txt variant="caption" tone="subtle">
          {page.text.length.toLocaleString('vi-VN')}
        </Txt>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={p.fgSubtle} />
      </Pressable>
      {open && (
        <View style={{ padding: space.md, paddingTop: 0 }}>
          <Field label={`Văn bản ${title.toLowerCase()}`} value={page.text} onChangeText={onChange} multiline />
        </View>
      )}
    </Card>
  );
}
