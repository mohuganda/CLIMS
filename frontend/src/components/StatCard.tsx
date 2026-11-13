import type { LucideIcon } from 'lucide-react';

import { SampleBadge } from '@/components/SampleData';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  /** Already formatted for display. */
  value: string;
  icon: LucideIcon;
  /** True while the figure is being fetched. */
  isLoading?: boolean;
  /** True when the figure is illustrative rather than read from the API. */
  isSample?: boolean;
}

/** One headline figure. Layout follows the reference design's KPI card. */
export function StatCard({
  label,
  value,
  icon: Icon,
  isLoading = false,
  isSample = false,
}: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
          {isSample ? <SampleBadge /> : null}
        </div>
        <div className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-muted-foreground size-4" aria-hidden="true" />
        </div>
      </div>
      {isLoading ? (
        <div role="status">
          <Skeleton className="h-8 w-24 lg:h-9" />
          <span className="sr-only">Loading {label.toLowerCase()}…</span>
        </div>
      ) : (
        <p className="text-foreground text-2xl font-bold tracking-tight break-words tabular-nums lg:text-3xl">
          {value}
        </p>
      )}
    </div>
  );
}

/**
 * Lays stat cards out in equal columns that wrap, so three cards fill a row as
 * evenly as four do and a narrow screen stacks them.
 */
export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] gap-4">
      {children}
    </div>
  );
}
