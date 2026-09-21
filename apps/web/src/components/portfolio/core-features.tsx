import { FEATURES } from '@/content/portfolio';
import { usePick } from '@/lib/portfolio-language';
import { SectionHeading } from './section-heading';
import { StatusBadge } from './status-badge';

export function CoreFeatures() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={FEATURES.eyebrow} title={FEATURES.title} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-surface-200 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-lg bg-navy-800 font-mono text-xs font-bold text-sky-500">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <StatusBadge label={item.status} />
              </div>
              <h3 className="font-semibold text-ink-900">{usePick(item.title)}</h3>
              <p className="mt-2 text-sm text-ink-500">{usePick(item.description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
