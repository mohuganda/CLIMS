import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** One line on what the page is for. The page title itself lives in the app header. */
  description: string;
  /** Page-level actions, e.g. a create button. */
  actions?: ReactNode;
}

/** The strip under the app header: what this page is for, and its primary actions. */
export function PageHeader({ description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm text-pretty">{description}</p>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
