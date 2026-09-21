import { cn } from './cn';

/**
 * Ô xám nhấp nháy khi đang tải.
 *
 * Dùng `surface-200` chứ không `surface-300`: skeleton phải gợi ý *bố cục sắp tới*, không
 * tranh sự chú ý với nội dung đã tải xong ở quanh nó. Bo `rounded-lg` cho khớp với thẻ và
 * ô nhập nên khi nội dung thật thay vào chỗ, hình khối không nhảy.
 *
 * `animate-pulse` tự tắt theo `prefers-reduced-motion` nhờ khối global trong globals.css.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-200', className)} aria-hidden />;
}
