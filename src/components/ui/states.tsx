import { router } from 'expo-router';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Mascot } from '../mascot';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Skeleton } from './surface';
import { Txt } from './text';

/**
 * Năm trạng thái bắt buộc của một màn có dữ liệu (AGENTS.md của LEARN): Loading · Empty · Error ·
 * Partial · Success. Các khối dưới đây là bốn trạng thái đầu, dùng chung cho mọi màn.
 */

export function LoadingState({ rows = 3, height = 72, label }: { rows?: number; height?: number; label: string }) {
  return (
    <View accessible accessibilityLabel={label} aria-busy style={{ gap: space.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  compact?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        styles.center,
        {
          borderColor: p.lineStrong,
          paddingVertical: compact ? space.xl : space.xxl,
        },
      ]}
    >
      {!compact && <Mascot state="sleeping" size={84} />}
      <Txt variant="heading" style={styles.centerText}>
        {title}
      </Txt>
      <Txt variant="small" tone="subtle" style={styles.centerText}>
        {description}
      </Txt>
      {action && (
        <Button label={action.label} icon={action.icon} onPress={action.onPress} style={{ marginTop: space.sm }} />
      )}
    </View>
  );
}

export function ErrorState({
  title,
  description,
  detail,
  onRetry,
}: {
  title: string;
  description: string;
  detail?: string;
  onRetry?: () => void;
}) {
  const p = usePalette();
  return (
    <View accessibilityRole="alert" style={[styles.center, { borderColor: p.fgSubtle, paddingVertical: space.xxl }]}>
      <Mascot state="alerting" size={80} />
      <Txt variant="heading" style={styles.centerText}>
        {title}
      </Txt>
      <Txt variant="small" tone="subtle" style={styles.centerText}>
        {description}
      </Txt>
      {detail && (
        <Txt variant="caption" tone="subtle" selectable style={styles.centerText}>
          Mã yêu cầu: {detail}
        </Txt>
      )}
      {onRetry && <Button label="Thử lại" icon="retry" variant="secondary" onPress={onRetry} style={{ marginTop: space.sm }} />}
    </View>
  );
}

/** Lỗi ngay tại chỗ (form, hành động) — viền đậm + icon, không chỉ bằng màu (ADR 015). */
export function InlineError({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View accessibilityRole="alert" style={[styles.inline, { borderColor: p.fgMuted, backgroundColor: p.panel2 }, style]}>
      <Icon name="alert" size={18} color={p.fg} />
      <Txt variant="small" style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

/** Ghi chú / trạng thái "một phần" (Partial) — nền xám nhạt, icon thông tin. */
export function Notice({
  children,
  icon = 'info',
  style,
}: {
  children: React.ReactNode;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const p = usePalette();
  return (
    <View style={[styles.inline, { borderColor: p.line, backgroundColor: p.muted }, style]}>
      <Icon name={icon} size={18} color={p.fgMuted} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const METRIC_LABEL: Record<string, string> = {
  COURSES_CREATED: 'khóa học',
  DOCUMENTS_UPLOADED: 'tài liệu trong tháng',
  PAGES_PROCESSED: 'trang xử lý',
  AI_JOBS_RUN: 'lượt sinh AI trong tháng',
};

/** Băng cảnh báo 402 QUOTA_EXCEEDED — hiện đúng used/limit và đường nâng cấp gói. */
export function QuotaNotice({
  metric,
  limit,
  used,
  style,
}: {
  metric: string;
  limit: number;
  used: number;
  style?: ViewStyle;
}) {
  return (
    <Notice icon="alert" style={style}>
      <Txt variant="small">
        Bạn đã dùng{' '}
        <Txt variant="smallStrong">
          {used}/{limit}
        </Txt>{' '}
        {METRIC_LABEL[metric] ?? metric}, đã chạm hạn mức của gói hiện tại.
      </Txt>
      <Txt
        variant="smallStrong"
        accessibilityRole="link"
        onPress={() => router.navigate('/settings')}
        style={{ marginTop: 4, textDecorationLine: 'underline' }}
      >
        Nâng cấp gói để tiếp tục
      </Txt>
    </Notice>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.card,
  },
  centerText: { textAlign: 'center' },
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
  },
});
