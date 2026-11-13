/// <reference types="vite/client" />
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

/*
 * Renders the screen at the test router's current address, from the same
 * files Next.js routes to: the `page.tsx` under `src/app`, inside the layout
 * of its route group. Tests therefore exercise the real pages and the real
 * guard-and-shell layout, and follow redirects the way a browser would.
 *
 * Left out: the root layout (it is the <html> document and waits for a
 * request), and the catch-all page whose only job is to call `notFound()`.
 */

interface PageModule {
  default: ComponentType;
}
interface LayoutModule {
  default: ComponentType<{ children: ReactNode }>;
}

const pageModules = import.meta.glob<PageModule>(
  ['../app/**/page.tsx', '!../app/**/\\[...notFound\\]/page.tsx'],
  { eager: true },
);
const appLayout = import.meta.glob<LayoutModule>('../app/(app)/layout.tsx', { eager: true });
const appNotFound = import.meta.glob<PageModule>('../app/(app)/not-found.tsx', { eager: true });

const only = <T,>(modules: Record<string, T>): T => {
  const [module] = Object.values(modules);
  if (!module) throw new Error('A file the test router depends on is missing from src/app.');
  return module;
};

const AppLayout = only(appLayout).default;
const NotFound = only(appNotFound).default;

interface Route {
  Page: ComponentType;
  /** Whether the page sits in the `(app)` group, behind the guard and inside the shell. */
  isInApp: boolean;
}

const routes = new Map<string, Route>(
  Object.entries(pageModules).map(([file, module]) => {
    const segments = file
      .replace('../app', '')
      .replace(/\/page\.tsx$/, '')
      .split('/');
    const path = segments.filter((segment) => !segment.startsWith('(')).join('/') || '/';
    return [path, { Page: module.default, isInApp: segments.includes('(app)') }];
  }),
);

/** Every address that has a `page.tsx`, as the navigation table would write it. */
export const routedPaths: readonly string[] = [...routes.keys()].sort();

export function AppUnderTest() {
  const pathname = usePathname();
  const route = routes.get(pathname);

  if (!route) {
    return (
      <AppLayout>
        <NotFound />
      </AppLayout>
    );
  }
  if (!route.isInApp) return <route.Page />;
  return (
    <AppLayout>
      <route.Page />
    </AppLayout>
  );
}
