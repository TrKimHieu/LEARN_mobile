import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Mascot } from '@/components/mascot';
import { Button, Card, Icon, Notice, ProgressBar, Txt } from '@/components/ui';
import { errorText } from '@/lib/api-client';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { partialFailuresOf, useAiJob, useCancelAiJob } from '../ai-api';

/**
 * Tiến độ AI Job — port của `apps/web/src/features/ai/components/ai-job-progress.tsx`: % + nhãn bước + mascot
 * theo trạng thái (một trong bốn vị trí `[SPEC]` §13.1 cho phép mascot), hỏi lại mỗi 2 giây.
 */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Card style={styles.panel}>
      <View accessibilityLiveRegion="polite" style={styles.inner}>
        {children}
      </View>
    </Card>
  );
}

export function AiJobProgress({ jobId, onDone }: { jobId: string; onDone: (r: { succeeded: boolean }) => void }) {
  const p = usePalette();
  const job = useAiJob(jobId);
  const cancel = useCancelAiJob(jobId);
  const status = job.data?.status;
  const partial = partialFailuresOf(job.data?.error);

  useEffect(() => {
    // Xong trọn vẹn thì tự đi tiếp sau một nhịp; xong MỘT PHẦN thì để người dùng đọc phần thiếu.
    if (status === 'SUCCEEDED' && partial.length === 0) {
      const t = setTimeout(() => onDone({ succeeded: true }), 900);
      return () => clearTimeout(t);
    }
  }, [status, partial.length, onDone]);

  if (job.isLoading) {
    return (
      <Panel>
        <Mascot state="thinking" size={80} />
        <Txt variant="small" tone="subtle">
          Đang kết nối tới AI Job…
        </Txt>
      </Panel>
    );
  }

  if (job.isError || !job.data) {
    return (
      <Panel>
        <Mascot state="alerting" size={80} />
        <Txt variant="smallStrong" style={styles.center}>
          {errorText(job.error, 'Không theo dõi được job.')}
        </Txt>
        <Button label="Đóng" variant="secondary" onPress={() => onDone({ succeeded: false })} />
      </Panel>
    );
  }

  const j = job.data;

  if (j.status === 'QUEUED' || j.status === 'RUNNING') {
    const queued = j.status === 'QUEUED';
    return (
      <Panel>
        <Mascot state={queued ? 'thinking' : 'working'} size={88} />
        <Txt variant="caption" tone="subtle">
          AI Job · {queued ? 'đang chờ' : 'đang chạy'}
        </Txt>
        <Txt variant="bodyStrong" style={styles.center}>
          {queued ? 'Đang xếp hàng…' : (j.progressLabel ?? 'Đang xử lý…')}
        </Txt>
        <View style={{ alignSelf: 'stretch', gap: 6 }}>
          <ProgressBar value={Math.max(4, j.progress)} max={100} label={`Tiến độ sinh bài học: ${j.progress}%`} />
          <Txt variant="caption" tone="subtle" style={styles.center}>
            {j.progress}%
          </Txt>
        </View>
        <Button
          label={cancel.isPending ? 'Đang huỷ…' : 'Huỷ job'}
          variant="ghost"
          size="sm"
          disabled={cancel.isPending}
          onPress={() => cancel.mutate()}
        />
      </Panel>
    );
  }

  if (j.status === 'SUCCEEDED') {
    // PARTIAL của HANDBOOK: job SUCCEEDED nhưng một số node outline không sinh được bài hợp lệ.
    if (partial.length > 0) {
      return (
        <Panel>
          <Mascot state="alerting" size={80} />
          <Txt variant="smallStrong" style={styles.center}>
            Đã sinh xong, nhưng {partial.length} phần không hoàn thành
          </Txt>
          <Notice>
            <Txt variant="small">
              Những phần dưới đây không sinh được bài học hợp lệ. Các bài còn lại đã sẵn sàng, bạn có thể học
              ngay, rồi chạy sinh lại để bổ sung phần thiếu.
            </Txt>
          </Notice>
          <View style={{ alignSelf: 'stretch', gap: space.xs }}>
            {partial.map((f) => (
              <View key={f.node} style={[styles.failure, { borderColor: p.line, backgroundColor: p.panel2 }]}>
                <Txt variant="caption">
                  <Txt variant="caption" style={{ fontWeight: '600' }}>
                    {f.node}
                  </Txt>
                  {f.errors.length > 0 && <Txt variant="caption" tone="subtle">: {f.errors.join('; ')}</Txt>}
                </Txt>
              </View>
            ))}
          </View>
          <Button label="Xem bài học đã sinh" onPress={() => onDone({ succeeded: true })} />
        </Panel>
      );
    }
    return (
      <Panel>
        <Mascot state="celebrate" size={88} />
        <View style={styles.row}>
          <Icon name="circle-check" size={18} filled />
          <Txt variant="bodyStrong">Hoàn tất! Bài học đã sẵn sàng.</Txt>
        </View>
      </Panel>
    );
  }

  // Huỷ là hành động chủ động của người dùng, không phải lỗi — không dùng mascot cảnh báo.
  const cancelled = j.status === 'CANCELLED';
  return (
    <Panel>
      <Mascot state={cancelled ? 'idle' : 'alerting'} size={80} />
      <Txt variant="smallStrong">{cancelled ? 'Đã huỷ job.' : 'Sinh bài học thất bại.'}</Txt>
      {j.error?.message && !cancelled && (
        <Txt variant="caption" tone="subtle" style={styles.center}>
          {j.error.message}
        </Txt>
      )}
      <Button label="Thử lại" icon="retry" onPress={() => onDone({ succeeded: false })} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { paddingVertical: space.xxl },
  inner: { alignItems: 'center', gap: space.md },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  failure: { borderWidth: 1, borderRadius: radius.control, padding: space.sm },
});
