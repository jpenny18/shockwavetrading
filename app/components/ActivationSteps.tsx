import Link from 'next/link';

const STEPS = ['Account', 'Details', 'Payment'] as const;

export default function ActivationSteps({
  current,
  homePath,
}: {
  current: 1 | 2 | 3;
  homePath: string;
}) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] sm:gap-3">
      {STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const active = step === current;
        const done = step < current;
        const content = (
          <span className={`flex items-center gap-2 rounded-full px-3 py-2 ${
            active
              ? 'bg-[#0FF1CE] text-black'
              : done
                ? 'bg-[#0FF1CE]/15 text-[#0FF1CE]'
                : 'bg-white/[0.04] text-white/35'
          }`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
              active ? 'bg-black/15' : 'bg-white/10'
            }`}>{step}</span>
            {label}
          </span>
        );
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            {step === 1 ? <Link href={homePath}>{content}</Link> : content}
            {step < 3 && <span className="hidden h-px w-6 bg-white/15 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}
