'use client';

import { createContext, use, type ReactNode } from 'react';

import type { StorageLike } from './jsonStorage';

const StorageContext = createContext<StorageLike | null>(null);

interface StorageProviderProps {
  storage: StorageLike;
  children: ReactNode;
}

/** Makes the place UI preferences are remembered available to the tree. */
export function StorageProvider({ storage, children }: StorageProviderProps) {
  return <StorageContext value={storage}>{children}</StorageContext>;
}

export function useAppStorage(): StorageLike {
  const storage = use(StorageContext);
  if (!storage) throw new Error('useAppStorage must be used inside <StorageProvider>.');
  return storage;
}
