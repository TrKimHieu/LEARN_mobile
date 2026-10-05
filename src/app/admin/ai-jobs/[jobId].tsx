import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  InlineError,
  LoadingState,
  Screen,
  SectionTitle,
  Txt,
} from '@/components/ui';
import {
  jobTypeLabel,
  statusLabel,
  useAdminAiJobDetail,
  useAiJobAuditLog,
  useRetryAiJob,
} from '@/features/admin/admin-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { absoluteTime } from '@/lib/format';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Chi tiết AI Job + chạy lại job lỗi — port của `/admin/ai-jobs/[jobId]` trên web. */
export default function AdminAiJobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useAdminAiJobDetail(jobId);
  const audit = useAiJobAuditLog(jobId);
  const retry = useRetryAiJob(jobId);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetry() {
    const ok = await confirmAction({
      title: 'Chạy lại job này?',
      message: 'Job được đưa lại vào hàng đợi với tham số gốc. Thao tác được ghi vào nhật ký.',
      confirmLabel: 'Chạy lại',
    });
    if (!ok) return;
    setRetryError(null);
    try {
      await retry.mutateAsync();
      await Promise.all([job.refetch(), audit.refetch()]);
    } catch (err) {
      setRetryError(errorText(err, 'Không chạy lại được job, vui lòng thử lại.'));
    }
  }

  if (job.isLoading) {
    return (
      <Screen>
        <LoadingState rows={4} height={72} label="Đang tải job" />
      </Screen>
    );
  }
  if (job.isError || !job.data) {
    return (
      <Screen onRefresh={job.refetch}>
        <ErrorState
          title="Không tải được job"
          description={errorText(job.error, 'Vui lòng thử lại.')}
          detail={errorDetail(job.error)}
          onRetry={() => void job.refetch()}
        />
      </Screen>
    );
  }

  const j = job.data;
  const facts = [
    { label: 'Tiến độ', value: `${j.progress}%${j.progressLabel ? ` · ${j.progressLabel}` : ''}` },
    { label: 'Lượt thử', value: String(j.attempt) },
    { label: 'Xếp hàng lúc', value: absoluteTime(j.queuedAt) },
    { label: 'Hoàn tất lúc', value: j.finishedAt ? absoluteTime(j.finishedAt) : 'Chưa xong' },
  ];

  return (
    <Screen onRefresh={() => Promise.all([job.refetch(), audit.refetch()])}>
      <Stack.Screen options={{ title: jobTypeLabel(j.type) }} />

      <View style={{ gap: space.sm }}>
        <Badge
          label={statusLabel(j.status)}
          tone={j.status === 'FAILED' ? 'strong' : 'neutral'}
          icon={j.status === 'FAILED' ? 'alert' : j.status === 'SUCCEEDED' ? 'check' : undefined}
        />
        <Txt variant="title">{j.courseTitle}</Txt>
        <Txt variant="small" tone="subtle">
          Yêu cầu bởi {j.requesterEmail}
        </Txt>
        {j.status === 'FAILED' && (
          <Button
            label={retry.isPending ? 'Đang chạy lại…' : 'Chạy lại job'}
            icon="retry"
            loading={retry.isPending}
            onPress={() => void handleRetry()}
            style={{ marginTop: space.sm }}
          />
        )}
        {retryError && <InlineError>{retryError}</InlineError>}
      </View>

      <Card padded={false}>
        {facts.map((f, i) => (
          <View key={f.label}>
            {i > 0 && <Divider />}
            <View style={styles.fact}>
              <Txt variant="small" tone="subtle">
                {f.label}
              </Txt>
              <Txt variant="smallStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
                {f.value}
              </Txt>
            </View>
          </View>
        ))}
      </Card>

      {j.error && (
        <Card emphasis="strong" style={{ gap: space.sm }}>
          <Txt variant="smallStrong">
            {j.error.code}: {j.error.message}
          </Txt>
          {j.error.detail != null && <Code text={JSON.stringify(j.error.detail, null, 2)} />}
        </Card>
      )}

      <View>
        <SectionTitle title="Tham số đầu vào" />
        <Code text={JSON.stringify(j.inputParams, null, 2)} />
      </View>

      <View>
        <SectionTitle title={`Lượt gọi LLM (${j.runs.length})`} />
        {j.runs.length === 0 ? (
          <EmptyState compact title="Chưa có lượt gọi nào" description="Job chưa gọi mô hình lần nào." />
        ) : (
          <Card padded={false}>
            {j.runs.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <Divider />}
                <View style={{ padding: space.md, gap: 2 }}>
                  <Txt variant="smallStrong">{r.step}</Txt>
                  <Txt variant="caption" tone="subtle" style={{ fontVariant: ['tabular-nums'] }}>
                    {r.model} · {r.inputTokens}/{r.outputTokens} token · {r.latencyMs}ms · {absoluteTime(r.createdAt)}
                  </Txt>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      <View>
        <SectionTitle title="Lịch sử thao tác admin" />
        {audit.isLoading && <LoadingState rows={2} height={48} label="Đang tải lịch sử thao tác" />}
        {audit.isError && (
          <ErrorState
            title="Không tải được lịch sử thao tác"
            description={errorText(audit.error, 'Vui lòng thử lại.')}
            detail={errorDetail(audit.error)}
            onRetry={() => void audit.refetch()}
          />
        )}
        {audit.data && audit.data.entries.length === 0 && (
          <EmptyState compact title="Chưa có thao tác admin nào" description="Chạy lại job sẽ được ghi ở đây." />
        )}
        {audit.data && audit.data.entries.length > 0 && (
          <Card padded={false}>
            {audit.data.entries.map((e, i) => (
              <View key={e.id}>
                {i > 0 && <Divider />}
                <Txt variant="small" style={{ padding: space.md }}>
                  <Txt variant="smallStrong">{e.action}</Txt>
                  <Txt variant="small" tone="subtle">
                    {' · '}
                    {e.actorEmail ?? 'hệ thống'} · {absoluteTime(e.createdAt)}
                  </Txt>
                </Txt>
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

function Code({ text }: { text: string }) {
  const p = usePalette();
  return (
    <ScrollView horizontal focusable tabIndex={0} aria-label="Dữ liệu JSON" style={[styles.code, { backgroundColor: p.muted }]} contentContainerStyle={{ padding: space.md }}>
      <Txt variant="caption" tone="muted" style={{ fontFamily: MONO }} selectable>
        {text}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, padding: space.md },
  code: { borderRadius: radius.control },
});
