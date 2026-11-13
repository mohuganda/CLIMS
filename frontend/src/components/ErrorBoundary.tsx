import { CircleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this value clears a caught error, e.g. the current path. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: string | undefined;
}

/**
 * Catches a rendering failure in one screen so the rest of the app (navigation,
 * sign-out) keeps working. The technical detail goes to the console for
 * whoever is debugging; the user sees what to do next.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { hasError: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled rendering error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <Empty className="min-h-[50vh]" role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <CircleAlert aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>This page could not be displayed</EmptyTitle>
          <EmptyDescription>
            Something went wrong while showing this page. Reloading usually fixes it; your saved
            data is not affected.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
}
