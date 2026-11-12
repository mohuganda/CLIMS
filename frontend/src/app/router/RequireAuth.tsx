import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useSession } from '@/features/auth/hooks';
import { safeReturnPath } from '@/features/auth/returnPath';

import { HOME_PATH, SIGN_IN_PATH } from './paths';

interface GuardProps {
  children: ReactNode;
}

/**
 * Renders its children only for a signed-in user; otherwise redirects to
 * sign-in, remembering where they were headed.
 *
 * This decides what the browser shows. It is not the access control: the API
 * authorises every request, and a page reached by tampering with storage
 * still gets a 401 for its data.
 */
export function RequireAuth({ children }: GuardProps) {
  const session = useSession();
  const location = useLocation();

  if (!session) {
    return (
      <Navigate
        to={SIGN_IN_PATH}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return children;
}

/** Sends an already signed-in user away from the sign-in page. */
export function RedirectIfSignedIn({ children }: GuardProps) {
  const session = useSession();
  const location = useLocation();

  if (session) {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={safeReturnPath(from, HOME_PATH, SIGN_IN_PATH)} replace />;
  }
  return children;
}
