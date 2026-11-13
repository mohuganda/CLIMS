import { SampleBadge } from '@/components/SampleData';
import { formatNumber } from '@/lib/format';
import { toPercentages } from '@/lib/percent';
import { cn } from '@/lib/utils';

export interface Share {
  label: string;
  value: number;
  /** A CSS colour, normally a `var(--chart-n)` token. */
  color: string;
}

interface ShareListProps {
  title: string;
  description: string;
  shares: readonly Share[];
  /** What the total counts, e.g. "Total condoms". */
  totalLabel: string;
  isSample?: boolean;
  className?: string;
}

/**
 * Parts of a whole as labelled bars, after the reference design's "stages"
 * card. Chosen over a donut: with a few parts, lengths on a shared scale
 * compare more accurately than angles, and every figure is printed.
 */
export function ShareList({
  title,
  description,
  shares,
  totalLabel,
  isSample = false,
  className,
}: ShareListProps) {
  const percentages = toPercentages(shares.map((share) => share.value));
  const total = shares.reduce((sum, share) => sum + share.value, 0);

  return (
    <section className={cn('bg-card flex min-w-0 flex-col rounded-xl border p-5', className)}>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {isSample ? <SampleBadge /> : null}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      </div>

      <ul className="flex flex-col gap-5">
        {shares.map((share, index) => (
          <li key={share.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{share.label}</span>
              <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                <span className="text-muted-foreground">{formatNumber(share.value)}</span>
                <span className="font-semibold">{percentages[index]}%</span>
              </span>
            </div>
            <div className="bg-secondary h-2 overflow-hidden rounded-full" aria-hidden="true">
              <div
                className="h-full rounded-full"
                style={{ width: `${percentages[index] ?? 0}%`, backgroundColor: share.color }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 text-sm">
        <span className="text-muted-foreground">{totalLabel}</span>
        <span className="text-lg font-bold tabular-nums">{formatNumber(total)}</span>
      </div>
    </section>
  );
}
