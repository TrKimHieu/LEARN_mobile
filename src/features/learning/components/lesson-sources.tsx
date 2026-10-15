import { StyleSheet, View } from 'react-native';
import type { LessonSource } from '@/contracts';
import { Button, Card, Icon, InlineError, LoadingState, Notice, Txt } from '@/components/ui';
import { errorText } from '@/lib/api-client';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { useLessonSources } from '../learning-api';

/**
 * Cảnh báo bài bám nguồn kém (NFR-AI-02, FR-LESSON-07): không được im lặng, và phải chỉ cách tự
 * kiểm — dẫn thẳng tới khối Nguồn.
 */
export function LowConfidenceNotice({ onShowSources }: { onShowSources: () => void }) {
  return (
    <Notice icon="alert">
      <Txt variant="smallStrong">Bài này có thể lệch khỏi tài liệu của bạn</Txt>
      <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
        Khi kiểm tra tự động, nhiều thuật ngữ trong bài không tìm thấy trong tài liệu gốc. Hãy đối chiếu với{' '}
        <Txt variant="smallStrong" accessibilityRole="link" onPress={onShowSources} style={{ textDecorationLine: 'underline' }}>
          đoạn tài liệu nguồn
        </Txt>{' '}
        trước khi dựa vào nội dung, hoặc sửa lại bài.
      </Txt>
    </Notice>
  );
}

function pageLabel(s: LessonSource): string | null {
  if (s.pageFrom === null) return null;
  if (s.pageTo === null || s.pageTo === s.pageFrom) return `trang ${s.pageFrom}`;
  return `trang ${s.pageFrom} đến ${s.pageTo}`;
}

/** Đoạn tài liệu gốc mà bài học dựa vào (FR-LESSON-12) — thu gọn mặc định, chỉ tải khi mở. */
export function LessonSources({
  courseId,
  lessonId,
  open,
  onToggle,
}: {
  courseId: string;
  lessonId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const p = usePalette();
  const sources = useLessonSources(courseId, lessonId, open);
  const list = sources.data?.sources ?? [];

  return (
    <View style={[styles.wrap, { borderTopColor: p.line }]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">Nguồn trong tài liệu</Txt>
          <Txt variant="small" tone="subtle">
            Những đoạn tài liệu gốc mà bài học này được soạn từ đó.
          </Txt>
        </View>
        <Button
          label={open ? 'Thu gọn' : 'Xem nguồn'}
          iconRight={open ? 'chevron-up' : 'chevron-down'}
          variant="secondary"
          size="sm"
          onPress={onToggle}
        />
      </View>

      {open && sources.isLoading && <LoadingState rows={2} height={90} label="Đang tải đoạn tài liệu nguồn" />}
      {open && sources.isError && (
        <InlineError>{errorText(sources.error, 'Không tải được tài liệu nguồn, vui lòng thử lại.')}</InlineError>
      )}
      {open && sources.data && list.length === 0 && (
        <Txt variant="small" tone="subtle">
          Không còn đoạn nguồn nào. Tài liệu gốc có thể đã bị xoá khỏi khóa học.
        </Txt>
      )}
      {open &&
        list.map((s) => {
          const page = pageLabel(s);
          return (
            <Card key={s.chunkId} style={{ gap: space.sm }}>
              <View style={styles.meta}>
                <Icon name="file" size={14} color={p.fgSubtle} />
                <Txt variant="caption" style={{ flexShrink: 1 }}>
                  {s.filename}
                  {page ? ` · ${page}` : ''}
                </Txt>
              </View>
              {s.headingPath && (
                <Txt variant="caption" tone="muted">
                  {s.headingPath}
                </Txt>
              )}
              <View style={[styles.quote, { borderLeftColor: p.lineStrong }]}>
                {/* Dấu `#` là của bộ trích xuất, không phải chữ trong tài liệu. */}
                <Txt variant="small" tone="muted" selectable>
                  {s.excerpt.replace(/^#{1,6}\s+/gm, '')}
                  {s.truncated ? '…' : ''}
                </Txt>
              </View>
            </Card>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingTop: space.xl, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quote: { borderLeftWidth: 2, paddingLeft: space.md },
});
