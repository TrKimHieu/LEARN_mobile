import { SCREENSHOTS } from '@/content/portfolio';
import { usePick } from '@/lib/portfolio-language';
import { SectionHeading } from './section-heading';

export function Screenshots() {
  return (
    <section className="bg-surface-100 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={SCREENSHOTS.eyebrow}
          title={SCREENSHOTS.title}
          intro={SCREENSHOTS.note}
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENSHOTS.items.map((item) => (
            <figure key={item.file} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="aspect-[4/3] w-full border-b border-surface-200 bg-surface-200">
                {/* `figcaption` ngay dưới đã mô tả ảnh; để `alt` lặp lại đúng
                    chuỗi đó thì trình đọc màn hình đọc hai lần. */}
                <img
                  src={`/screenshots/${item.file}`}
                  alt=""
                  className="size-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-ink-700">
                {usePick(item.caption)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
