import { Mascot, type MascotState } from '../mascot';
import { Button } from './button';
import { Card } from './card';
import { Icon } from './icon';
import { Skeleton } from './skeleton';
import { cn } from './cn';

/**
 * 5 trạng thái bắt buộc của một màn có dữ liệu (AGENTS.md): Loading · Empty ·
 * Error · Partial · Success. Bốn thành phần dưới đây phủ 4 trạng thái đầu.
 *
 * Loading dùng skeleton chứ không dùng mascot: HANDBOOK §13.1 `[SPEC]` giới hạn
 * mascot ở hero, empty state, tiến độ AI Job và lỗi.
 *
 * Nguyên tắc chung cho cả bốn: **luôn nói bước tiếp theo là gì**. Một màn rỗng chỉ ghi
 * "Không có dữ liệu" đẩy người dùng vào ngõ cụt; nó phải nói được vì sao rỗng và nút nào
 * làm nó hết rỗng.
 */

/**
 * Skeleton khớp hình dạng nội dung sắp hiện ra.
 *
 * `variant` để khối chờ có tỉ lệ giống thứ nó thay thế — skeleton cao bằng nhau cho mọi
 * màn làm bố cục nhảy một nhịp khi dữ liệu về (layout shift).
 */
export function LoadingState({
  rows = 3,
  variant = 'card',
  className,
  label = 'Đang tải',
}: {
  rows?: number;
  variant?: 'card' | 'list' | 'text';
  className?: string;
  label?: string;
}) {
  const shape = {
    card: 'h-24 w-full',
    list: 'h-12 w-full',
    text: 'h-4 w-full',
  }[variant];

  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          // Dòng cuối ngắn hơn: khối chữ thật hiếm khi tràn đủ chiều rộng dòng cuối.
          className={cn(shape, variant === 'text' && i === rows - 1 && 'w-2/3')}
        />
      ))}
    </div>
  );
}

/**
 * Màn rỗng. `action` là lối thoát — gần như luôn nên có.
 * `secondaryAction` cho trường hợp có hai đường đi hợp lý (ví dụ: tải tài liệu lên *hoặc*
 * xem khoá học mẫu).
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  mascot = 'sleeping',
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  mascot?: MascotState;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <Mascot state={mascot} size={88} />
      <p className="mt-5 text-base font-semibold tracking-tight text-ink-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Lỗi tải dữ liệu.
 *
 * Viền `danger-100` mảnh thay vì nền đỏ: đây là "thử lại được", không phải "hỏng rồi".
 * `detail` để đặt mã lỗi / requestId — thứ người dùng copy được khi báo lỗi — tách khỏi
 * câu giải thích cho người đọc.
 */
export function ErrorState({
  title = 'Không tải được dữ liệu',
  description,
  detail,
  onRetry,
}: {
  title?: string;
  description?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center border-danger-100 px-6 py-12 text-center">
      <Mascot state="alerting" size={88} />
      <p className="mt-5 flex items-center gap-1.5 text-base font-semibold tracking-tight text-danger-700">
        <Icon name="alert" size={16} />
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {detail && (
        <code className="mt-3 rounded-md bg-surface-100 px-2 py-1 font-mono text-xs text-ink-500">
          {detail}
        </code>
      )}
      {onRetry && (
        <Button className="mt-6" variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </Card>
  );
}

/**
 * Partial: có dữ liệu nhưng thiếu/chưa đủ — hiện dữ liệu kèm dải cảnh báo,
 * không thay thế nội dung.
 */
export function PartialNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning-100 bg-warning-50 px-4 py-3 text-sm leading-relaxed text-warning-700"
    >
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
