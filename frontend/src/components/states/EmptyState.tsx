import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** The next step, when there is one (usually the page's create button). */
  action?: ReactNode;
}

/** Shown in place of a list that has nothing in it. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
