'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/states/PageLoader';
import { applyTheme, loadTheme } from '@/components/theme/theme';
import { ConfigError, parseConfig, type AppConfig } from '@/config/env';
import { selectSession, selectToken, sessionEnded } from '@/features/auth/authSlice';
import { createSessionStore } from '@/features/auth/session';
import { createHttpClient, type HttpClient } from '@/lib/api';
import { createQueryClient } from '@/lib/query/queryClient';
import { getBrowserStorage } from '@/lib/storage/browserStorage';
import type { StorageLike } from '@/lib/storage/jsonStorage';
import { createAppStore, syncSessionAcrossTabs, type AppStore } from '@/store/store';

import { AppProviders } from './AppProviders';

interface App {
  config: AppConfig;
  storage: StorageLike;
  store: AppStore;
  queryClient: ReturnType<typeof createQueryClient>;
  http: HttpClient;
}

/*
 * The composition root: the one place where the app's long-lived objects are
 * created and wired together. Nothing below this file reaches for a global.
 *
 * The session, the theme and the sidebar state live in the browser's storage,
 * so none of this can exist on the server. It is built once, in the browser.
 */
function createApp(): App {
  // Next.js inlines each NEXT_PUBLIC_* value where it is named in full, so
  // these must be spelled out rather than read from `process.env` as a whole.
  const config = parseConfig({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
  const storage = getBrowserStorage();
  // Before the app renders, so a dark-theme user never sees it in light.
  applyTheme(document.documentElement, loadTheme(storage));
  const sessionStore = createSessionStore(storage);
  const store = createAppStore({ sessionStore });
  syncSessionAcrossTabs(store, sessionStore, window);

  const queryClient = createQueryClient({
    onMutationError: (error) => {
      // An expired session is announced once, below, not once per failed write.
      if (error.kind !== 'unauthorized') toast.error(error.message);
    },
  });

  const http = createHttpClient({
    baseUrl: config.apiBaseUrl,
    getToken: () => selectToken(store.getState()),
    onUnauthorized: () => {
      // Several requests can be rejected together; only the first ends the session.
      if (!selectSession(store.getState())) return;
      store.dispatch(sessionEnded());
      queryClient.clear();
      toast.info('Your session has expired. Sign in again.');
    },
  });

  return { config, storage, store, queryClient, http };
}

type AppResult = { app: App; error: null } | { app: null; error: ConfigError };

let created: AppResult | undefined;

/** The one app instance for this page load, or the reason it could not be built. */
function getApp(): AppResult {
  if (created) return created;
  try {
    created = { app: createApp(), error: null };
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    console.error(error);
    created = { app: null, error };
  }
  return created;
}

const subscribeToNothing = () => () => undefined;

interface AppRootProps {
  children: ReactNode;
}

/**
 * Wraps every route in the app's providers.
 *
 * The server render and the hydration pass show a loader; the app itself
 * starts on the first render after that, when the browser's storage can be
 * read. Rendering it any earlier would mean guessing whether the visitor is
 * signed in, and showing the wrong screen when the guess is wrong.
 */
export function AppRoot({ children }: AppRootProps) {
  const isInBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  if (!isInBrowser) return <PageLoader />;
  return <BrowserApp>{children}</BrowserApp>;
}

function BrowserApp({ children }: AppRootProps) {
  const [{ app, error }] = useState(getApp);

  if (error) {
    // A misconfigured build cannot run. Say so plainly instead of showing a blank page.
    return (
      <p role="alert" className="max-w-2xl p-8 font-sans">
        CLIMS is not configured correctly and cannot start. {error.message}
      </p>
    );
  }

  return (
    <ErrorBoundary>
      <AppProviders
        config={app.config}
        store={app.store}
        queryClient={app.queryClient}
        http={app.http}
        storage={app.storage}
      >
        {children}
      </AppProviders>
    </ErrorBoundary>
  );
}
