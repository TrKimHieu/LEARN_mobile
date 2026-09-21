import { VALUE } from '@/content/portfolio';
import { usePick } from '@/lib/portfolio-language';
import { SectionHeading } from './section-heading';

export function ProductValue() {
  return (
    <section className="bg-surface-100 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={VALUE.eyebrow} title={VALUE.title} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE.items.map((item, i) => (
            <div key={i} className="rounded-xl bg-white p-5">
              <h3 className="font-semibold text-ink-900">{usePick(item.title)}</h3>
              <p className="mt-2 text-sm text-ink-500">{usePick(item.description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
