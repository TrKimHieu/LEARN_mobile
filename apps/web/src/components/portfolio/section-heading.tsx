import type { Bi } from '@/content/portfolio';
import { usePick } from '@/lib/portfolio-language';

export function SectionHeading({
  eyebrow,
  title,
  intro,
  light = false,
}: {
  eyebrow: Bi;
  title: Bi;
  intro?: Bi;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`font-mono text-xs font-bold uppercase tracking-[0.14em] ${
          light ? 'text-sky-400' : 'text-sky-700'
        }`}
      >
        {usePick(eyebrow)}
      </p>
      <h2
        className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
          light ? 'text-surface-100' : 'text-ink-900'
        }`}
      >
        {usePick(title)}
      </h2>
      {intro && (
        <p className={`mt-3 text-base ${light ? 'text-surface-100/75' : 'text-ink-500'}`}>
          {usePick(intro)}
        </p>
      )}
    </div>
  );
}
