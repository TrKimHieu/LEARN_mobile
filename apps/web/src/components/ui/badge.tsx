import { cn } from './cn';
import { Icon, type IconName } from './icon';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// Nền nhạt + vòng viền 1px cùng sắc: nhãn đọc được rõ trên cả nền trắng lẫn nền
// surface-100 mà không cần tăng độ bão hoà (vốn sẽ phá tương phản chữ đã đo đạt AA).
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-100 text-ink-700 ring-surface-300',
  info: 'bg-sky-50 text-sky-700 ring-sky-100',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
};

/** Nhãn trạng thái. `icon` để trạng thái không chỉ được phân biệt bằng màu. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
