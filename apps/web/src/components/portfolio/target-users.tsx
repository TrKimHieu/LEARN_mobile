import { USERS } from '@/content/portfolio';
import { usePick } from '@/lib/portfolio-language';
import { SectionHeading } from './section-heading';

export function TargetUsers() {
  return (
    <section id="product" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={USERS.eyebrow} title={USERS.title} />
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {USERS.groups.map((group, i) => (
            <div key={i} className="rounded-xl border border-surface-200 bg-surface-100 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-ink-900">{usePick(group.name)}</h3>
              </div>
              <span className="mt-1 inline-block rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700">
                {usePick(group.badge)}
              </span>
              <p className="mt-3 text-sm text-ink-500">{usePick(group.description)}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                {group.needs.map((need, j) => (
                  <li key={j} className="flex gap-2">
                    <span aria-hidden="true" className="text-sky-500">
                      ✓
                    </span>
                    {usePick(need)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
