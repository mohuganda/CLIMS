import { Boxes } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BrandProps {
  /** Hides the wordmark, leaving the mark (used when the sidebar is collapsed). */
  compact?: boolean;
  className?: string;
}

/** The product mark and name. */
export function Brand({ compact = false, className }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Boxes className="size-5" aria-hidden="true" />
      </div>
      <span
        translate="no"
        className={cn('text-lg font-semibold whitespace-nowrap', compact && 'sr-only')}
      >
        CLIMS
      </span>
    </div>
  );
}
