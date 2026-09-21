import { BRAND } from '@learn/ui';
import { useLang } from '@/lib/portfolio-language';

export function PortfolioFooter() {
  const lang = useLang();
  return (
    <footer className="border-t border-surface-200 bg-white py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-ink-500 sm:px-6">
        <p>
          © {new Date().getFullYear()} {BRAND.name}.
        </p>
        <p>
          {lang === 'vi'
            ? 'Dự án portfolio kỹ thuật — không phải sản phẩm thương mại đang vận hành.'
            : 'An engineering portfolio project — not a live commercial product.'}
        </p>
      </div>
    </footer>
  );
}
