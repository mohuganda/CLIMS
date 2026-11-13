'use client';

import { createContext, use, type ReactNode } from 'react';

import type { HttpClient } from './http';

const HttpContext = createContext<HttpClient | null>(null);

interface HttpProviderProps {
  client: HttpClient;
  children: ReactNode;
}

/** Makes the app's HTTP client available to feature hooks without a module-level global. */
export function HttpProvider({ client, children }: HttpProviderProps) {
  return <HttpContext value={client}>{children}</HttpContext>;
}

/** The HTTP client for the current tree. Throws when rendered outside an {@link HttpProvider}. */
export function useHttp(): HttpClient {
  const client = use(HttpContext);
  if (!client) throw new Error('useHttp must be used inside <HttpProvider>.');
  return client;
}
