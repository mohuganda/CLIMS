'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PageLoader } from '@/components/states/PageLoader';
import { useSession } from '@/features/auth/hooks';
import { safeReturnPath } from '@/features/auth/returnPath';

import { HOME_PATH, SIGN_IN_PATH } from './paths';

/** The query parameter that carries where a visitor was headed when the guard intercepted them. */
const RETURN_PARAM = 'from';

/** The sign-in address that returns the visitor to `from` once they have signed in. */
export function signInHref(from: string): string {
  if (from === HOME_PATH || from === '/') return SIGN_IN_PATH;
  return `${SIGN_IN_PATH}?${new URLSearchParams({ [RETURN_PARAM]: from }).toString()}`;
}

interface RedirectProps {
  to: string;
}

/** Replaces the current address with `to`, showing a loader for the moment that takes. */
function Redirect({ to }: RedirectProps) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <PageLoader />;
}

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
  const pathname = usePathname();
  const search = useSearchParams().toString();

  if (!session) return <Redirect to={signInHref(search ? `${pathname}?${search}` : pathname)} />;
  return children;
}

/** Sends an already signed-in user away from the sign-in page. */
export function RedirectIfSignedIn({ children }: GuardProps) {
  const session = useSession();
  const from = useSearchParams().get(RETURN_PARAM);

  if (session) return <Redirect to={safeReturnPath(from, HOME_PATH, SIGN_IN_PATH)} />;
  return children;
}
