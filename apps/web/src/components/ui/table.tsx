import { Card } from './card';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Skeleton } from './skeleton';
import { cn } from './cn';

/**
 * Bảng dữ liệu. Bọc trong `Card` + `overflow-x-auto` để bảng nhiều cột cuộn
 * ngang trong vùng của nó thay vì làm tràn cả trang trên màn hẹp.
 */
export function TableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card padded={false} className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full min-w-max text-sm">{children}</table>;
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-surface-300 bg-surface-100 text-left">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-3 text-xs font-medium text-ink-500',
        align === 'right' && 'text-right',
      )}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-surface-200">{children}</tbody>;
}

export function Td({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <td className={cn('px-4 py-3 text-ink-700', align === 'right' && 'text-right', className)}>
      {children}
    </td>
  );
}

/**
 * Khung chờ mang hình dạng của chính cái bảng sắp hiện ra.
 *
 * Trước đây các màn admin dùng `<Skeleton className="h-48" />` — một tảng xám đặc. Nó không
 * cho biết sắp có gì, và khi dữ liệu về thì cả trang giật một nhịp vì chiều cao thật khác
 * chiều cao tảng xám. Vẽ đúng số cột và số dòng thì chuyển tiếp gần như không thấy.
 */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <Card padded={false} className="overflow-hidden" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải dữ liệu</span>
      <div className="border-b border-surface-300 bg-surface-100 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-surface-200">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              // Cột đầu thường là định danh (email, tiêu đề) nên dài hơn phần còn lại.
              <Skeleton key={c} className={cn('h-4', c === 0 ? 'flex-[2]' : 'flex-1')} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Bảng không có dòng nào.
 *
 * Phân biệt hai tình huống mà bản trước gộp làm một câu ("Không có người dùng nào khớp."):
 *
 * - **`filtered`** — có dữ liệu, nhưng bộ lọc hiện tại không khớp gì. Lối ra là *bỏ bộ lọc*,
 *   nên phải có nút làm đúng việc đó; bảo người dùng tự nhớ mình đã gõ gì vào ô tìm kiếm là
 *   đẩy việc sang cho họ.
 * - **chưa có gì** — hệ thống thật sự trống. Lối ra nằm ở chỗ khác (hoặc không có, và khi đó
 *   phải nói rõ là không có việc gì phải làm).
 *
 * Không dùng `EmptyState` ở đây: `EmptyState` có mascot 88px, hợp với màn chính của người
 * học; bảng quản trị thì một dòng chữ căn giữa là đủ và đọc nhanh hơn.
 */
export function TableEmpty({
  title,
  description,
  icon = 'search',
  onClearFilter,
  clearLabel = 'Xoá bộ lọc',
}: {
  title: string;
  description?: string;
  icon?: IconName;
  onClearFilter?: () => void;
  clearLabel?: string;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-100 text-ink-300">
        <Icon name={icon} size={20} />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {onClearFilter && (
        <Button className="mt-5" variant="secondary" size="sm" onClick={onClearFilter}>
          {clearLabel}
        </Button>
      )}
    </Card>
  );
}
