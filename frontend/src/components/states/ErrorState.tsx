import { CircleAlert, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getErrorMessage } from '@/lib/api';

interface ErrorStateProps {
  /** What failed to load, e.g. "Could not load users". */
  title: string;
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** Shown in place of content that failed to load. Says what happened and offers the way out. */
export function ErrorState({ title, error, onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <Empty className="py-12" role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlert aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
            <RefreshCw
              data-icon="inline-start"
              className={isRetrying ? 'animate-spin' : undefined}
            />
            {isRetrying ? 'Retrying…' : 'Try again'}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
