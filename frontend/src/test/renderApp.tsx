import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { selectToken, sessionEnded } from '@/features/auth/authSlice';
import { createSessionStore, type Session } from '@/features/auth/session';
import { createHttpClient } from '@/lib/api';
import { createQueryClient } from '@/lib/query/queryClient';
import { createMemoryStorage } from '@/lib/storage/jsonStorage';
import { AppProviders } from '@/providers/AppProviders';
import { createAppStore } from '@/store/store';

import { createFakeAdapter } from './fakeAdapter';
import { testRouter } from './navigation';

export const testSession: Session = {
  token: 'test-token',
  user: {
    id: 1,
    username: 'snakato',
    role: 'Admin',
    firstname: 'Sarah',
    lastname: 'Nakato',
    email: 'sarah@example.org',
  },
};

interface RenderAppOptions {
  /** Initial address, e.g. `/moh/users`. */
  route?: string;
  /** Start signed in as {@link testSession}. */
  signedIn?: boolean;
  /** Scripted API replies, consumed in order. */
  replies?: Parameters<typeof createFakeAdapter>;
}

/**
 * Renders `ui` inside the real provider stack, wired exactly as `AppRoot`
 * wires it, but against in-memory storage, a scripted network and the test
 * router, which starts at `route`.
 */
export function renderApp(
  ui: ReactNode,
  { route = '/', signedIn = false, replies = [{ status: 200, body: [] }] }: RenderAppOptions = {},
) {
  testRouter.reset(route);
  const storage = createMemoryStorage(
    signedIn ? { 'clims.session': JSON.stringify(testSession) } : {},
  );
  const store = createAppStore({ sessionStore: createSessionStore(storage) });
  const onMutationError = vi.fn();
  const queryClient = createQueryClient({ onMutationError });
  const { adapter, requests } = createFakeAdapter(...replies);
  const http = createHttpClient({
    baseUrl: '/api',
    getToken: () => selectToken(store.getState()),
    onUnauthorized: () => store.dispatch(sessionEnded()),
    adapter,
  });

  const view = render(
    <AppProviders
      config={{ apiBaseUrl: '/api', googleMapsApiKey: null }}
      store={store}
      queryClient={queryClient}
      http={http}
      storage={storage}
    >
      {ui}
    </AppProviders>,
  );

  return { ...view, store, storage, requests, onMutationError };
}
