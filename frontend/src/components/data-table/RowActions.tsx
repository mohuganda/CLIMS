import { Ellipsis, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
}

interface RowActionsProps {
  /** Identifies the row to assistive technology, e.g. "Actions for nakato". */
  label: string;
  actions: readonly RowAction[];
}

/** The per-row actions menu at the end of a table row. */
export function RowActions({ label, actions }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map(({ label: actionLabel, icon: Icon, onSelect, destructive }) => (
          <DropdownMenuItem
            key={actionLabel}
            variant={destructive ? 'destructive' : 'default'}
            onSelect={onSelect}
          >
            <Icon aria-hidden="true" />
            {actionLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
