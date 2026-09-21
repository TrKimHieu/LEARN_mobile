'use client';

import { motion } from 'motion/react';
import { cn } from './cn';

/**
 * Thanh tiến độ.
 *
 * Phần lấp đầy chạy bằng `motion` thay vì `transition-[width]` của CSS: lò xo
 * (spring) dừng lại có độ nảy nhẹ nên mắt bắt được *hướng* thay đổi — tiến lên
 * hay lùi lại — thứ mà chuyển động tuyến tính không nói ra. Quan trọng nhất ở
 * màn kết quả bài tập, nơi thanh này nhảy ngay sau khi người học nộp bài.
 *
 * `MotionProvider` ở gốc cây đặt `reducedMotion="user"`, nên khi người dùng bật
 * giảm chuyển động thì thanh nhảy thẳng tới giá trị mới, không có lò xo.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'sky',
  size = 'md',
  className,
}: {
  value: number;
  max?: number;
  /** Mô tả cho trình đọc màn hình, ví dụ "Tiến độ khóa học". */
  label: string;
  tone?: 'sky' | 'success';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-pill bg-surface-300',
        size === 'sm' ? 'h-2' : 'h-4',
        className,
      )}
    >
      <motion.div
        className={cn('h-full rounded-pill', tone === 'success' ? 'bg-success-500' : 'bg-sky-500')}
        initial={false}
        animate={{ width: `${percent}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 24 }}
      />
    </div>
  );
}
