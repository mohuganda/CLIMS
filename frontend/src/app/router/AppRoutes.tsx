import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/states/PageLoader';
import type { StorageLike } from '@/lib/storage/jsonStorage';

import { HOME_PATH, SIGN_IN_PATH } from './paths';
import { RedirectIfSignedIn, RequireAuth } from './RequireAuth';
import { navGroups } from './routes';

const SignInPage = lazy(() => import('@/features/auth/SignInPage'));
const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

interface AppRoutesProps {
  /** Where UI preferences (sidebar state) are remembered. */
  storage: StorageLike;
}

/** The route tree: a public sign-in page, and everything else behind the guard. */
export function AppRoutes({ storage }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path={SIGN_IN_PATH}
        element={
          <RedirectIfSignedIn>
            <Suspense fallback={<PageLoader />}>
              <SignInPage />
            </Suspense>
          </RedirectIfSignedIn>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell groups={navGroups} storage={storage} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={HOME_PATH} replace />} />
        {navGroups.flatMap((group) =>
          group.items.map((item) => (
            <Route key={item.path} path={item.path} element={item.element} />
          )),
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
