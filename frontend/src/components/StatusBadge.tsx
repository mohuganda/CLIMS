import { statusTone, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: 'bg-success/10 text-success',
  caution: 'bg-warning/10 text-warning',
  negative: 'bg-destructive/10 text-destructive',
  neutral: 'bg-secondary text-muted-foreground',
};

interface StatusBadgeProps {
  status: string | null | undefined;
}

/** A status word as a tinted chip. The word carries the meaning; colour only reinforces it. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status?.trim();
  if (!label) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md px-2 py-1 text-xs font-medium capitalize',
        TONE_CLASSES[statusTone(label)],
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
