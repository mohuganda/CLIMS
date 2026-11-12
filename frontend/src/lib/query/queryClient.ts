import { MutationCache, QueryClient } from '@tanstack/react-query';

import { toApiError, type ApiError, type ApiErrorKind } from '@/lib/api';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Set when the calling screen shows the failure itself (e.g. inline in a form). */
      handlesOwnErrors?: boolean;
    };
  }
}

/** Failures worth retrying: the request may succeed if simply sent again. */
const TRANSIENT_KINDS: ReadonlySet<ApiErrorKind> = new Set(['network', 'timeout', 'server']);
const MAX_QUERY_RETRIES = 2;

/** Whether a failed read should be retried. Exported for tests. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && TRANSIENT_KINDS.has(toApiError(error).kind);
}

interface CreateQueryClientOptions {
  /**
   * Called for every failed mutation, so no write can fail silently. Individual
   * mutations do not need their own `onError` for the user to be told.
   */
  onMutationError: (error: ApiError) => void;
}

export function createQueryClient({ onMutationError }: CreateQueryClientOptions): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.handlesOwnErrors) return;
        const apiError = toApiError(error);
        // A cancelled write was the user's choice; nothing to report.
        if (apiError.kind !== 'cancelled') onMutationError(apiError);
      },
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Writes are never retried automatically: a create that timed out may
        // have succeeded, and sending it again would duplicate the record.
        retry: false,
      },
    },
  });
}
