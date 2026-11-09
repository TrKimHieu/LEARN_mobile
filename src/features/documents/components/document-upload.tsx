import { View } from 'react-native';
import { Button, InlineError, Notice, Txt } from '@/components/ui';
import { space } from '@/theme/tokens';
import { ImportReview } from '@/features/import/components/import-review';
import { useImport } from '@/features/import/use-import';

/** Nhập tài liệu: trích chữ ngay trên máy, chỉ gửi văn bản lên server. */
export function DocumentUpload({ courseId }: { courseId: string }) {
  const imp = useImport(courseId);
  const { state } = imp;
  const busy = state.phase === 'picking' || state.phase === 'extracting';

  return (
    <View style={{ gap: space.md }}>
      {imp.element}
      {(state.phase === 'review' || state.phase === 'sending') && (
        <ImportReview
          filename={imp.filename}
          onFilename={imp.setFilename}
          pages={imp.pages}
          onPageText={imp.setPageText}
          chars={imp.chars}
          skippedPages={imp.skippedPages}
          error={imp.error}
          sending={state.phase === 'sending'}
          canSend={imp.canSend}
          onSend={imp.send}
          onCancel={imp.cancel}
        />
      )}
      {(state.phase === 'idle' || state.phase === 'picking' || state.phase === 'extracting' || state.phase === 'error' || state.phase === 'done') && (
        <>
          {state.phase === 'done' && (
            <Notice icon="check">
              <Txt variant="small">Đã thêm tài liệu.</Txt>
            </Notice>
          )}
          {state.phase === 'error' && <InlineError>{state.message}</InlineError>}
          <Button
            label={state.phase === 'extracting' ? state.label : 'Nhập tài liệu'}
            icon="upload"
            variant="secondary"
            onPress={imp.start}
            loading={busy}
            fullWidth
          />
        </>
      )}
    </View>
  );
}
