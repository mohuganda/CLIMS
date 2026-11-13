'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserMenu } from '@/components/layout/UserMenu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useStoredBoolean } from '@/hooks/useStoredBoolean';
import type { StorageLike } from '@/lib/storage/jsonStorage';
import { findNavItem, type NavGroup } from '@/navigation/navigation';

interface AppShellProps {
  groups: readonly NavGroup[];
  /** Where the sidebar's open/closed preference is remembered. */
  storage: StorageLike;
  /** The routed page. */
  children: ReactNode;
}

/** The signed-in frame: sidebar, header and the routed page. */
export function AppShell({ groups, storage, children }: AppShellProps) {
  const pathname = usePathname();
  const title = findNavItem(groups, pathname)?.title ?? 'Page not found';
  const [isSidebarOpen, setIsSidebarOpen] = useStoredBoolean(storage, 'clims.sidebar-open', true);

  return (
    <SidebarProvider
      open={isSidebarOpen}
      onOpenChange={setIsSidebarOpen}
      style={{ '--sidebar-width-icon': '3.5rem' } as CSSProperties}
    >
      <a
        href="#main"
        className="bg-background text-foreground focus-visible:ring-ring sr-only z-50 rounded-lg px-3 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:ring-2"
      >
        Skip to content
      </a>
      <AppSidebar groups={groups} />
      <SidebarInset className="min-w-0">
        <header className="bg-background/80 sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground md:hidden" />
            <h1 className="truncate text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          <ErrorBoundary resetKey={pathname}>
            <div className="flex w-full flex-col gap-6">{children}</div>
          </ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
