import { cn } from './cn';

/**
 * Thẻ nội dung.
 *
 * Viền **1px** + `shadow-card`, không phải viền 2px: ở một màn có nhiều thẻ, viền dày
 * cộng lại thành một lưới kẻ ô nặng nề và mọi thẻ đều đòi sự chú ý ngang nhau. Bóng nhẹ
 * tách thẻ khỏi nền mà không vẽ thêm đường kẻ nào.
 *
 * `interactive` cho thẻ bấm được (thẻ khoá học, bài học): bóng nâng lên khi hover thay vì
 * đổi màu viền — chuyển động đủ để thấy thẻ "nổi lên", đủ nhẹ để không giật.
 */
export function Card({
  className,
  padded = true,
  interactive = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border border-surface-300 bg-white shadow-card',
        padded && 'p-6',
        interactive && 'transition-all duration-200 hover:border-surface-400 hover:shadow-raised',
        className,
      )}
      {...rest}
    />
  );
}

/**
 * Tiêu đề thẻ. Thứ bậc đến từ **độ đậm và màu chữ**, không từ cỡ chữ — `text-base` +
 * `font-semibold` + `text-ink-900` đứng cạnh mô tả `text-sm text-ink-500` đã đủ tách bạch.
 */
export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  // Nội dung đến từ `children` ở call site nên luật không nhìn thấy được từ đây.
  return (
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h2
      className={cn('text-base font-semibold tracking-tight text-ink-900', className)}
      {...rest}
    />
  );
}

/** Dòng mô tả dưới tiêu đề — cùng cỡ chữ, khác màu. */
export function CardDescription({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-ink-500', className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)} {...rest} />
  );
}
