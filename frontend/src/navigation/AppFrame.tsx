'use client';

import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppStorage } from '@/lib/storage/StorageProvider';

import { RequireAuth } from './guards';
import { navGroups } from './navGroups';

interface AppFrameProps {
  children: ReactNode;
}

/** Everything a signed-in screen sits inside: the guard, then the shell. */
export function AppFrame({ children }: AppFrameProps) {
  const storage = useAppStorage();
  return (
    <RequireAuth>
      <AppShell groups={navGroups} storage={storage}>
        {children}
      </AppShell>
    </RequireAuth>
  );
}
