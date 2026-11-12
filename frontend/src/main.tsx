import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { toast } from 'sonner';

import { AppProviders } from '@/app/AppProviders';
import { AppRoutes } from '@/app/router/AppRoutes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { applyTheme, loadTheme } from '@/components/theme/theme';
import { ConfigError, parseConfig, type AppConfig } from '@/config/env';
import { selectSession, selectToken, sessionEnded } from '@/features/auth/authSlice';
import { createSessionStore } from '@/features/auth/session';
import { createHttpClient } from '@/lib/api';
import { createQueryClient } from '@/lib/query/queryClient';
import { getBrowserStorage } from '@/lib/storage/browserStorage';
import { createAppStore, syncSessionAcrossTabs } from '@/store/store';

/*
 * The composition root: the one place where the app's long-lived objects are
 * created and wired together. Nothing below this file reaches for a global.
 */
function start(rootElement: HTMLElement, config: AppConfig) {
  const storage = getBrowserStorage();
  // Before the first render, so a dark-theme user never sees a light flash.
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

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AppProviders
          config={config}
          store={store}
          queryClient={queryClient}
          http={http}
          storage={storage}
        >
          <BrowserRouter>
            <AppRoutes storage={storage} />
          </BrowserRouter>
        </AppProviders>
      </ErrorBoundary>
    </StrictMode>,
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html is missing the #root element.');

try {
  start(rootElement, parseConfig(import.meta.env));
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  // A misconfigured build cannot run. Say so plainly instead of showing a blank page.
  console.error(error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'font-family: system-ui, sans-serif; padding: 2rem; max-width: 40rem;';
  message.textContent = `CLIMS is not configured correctly and cannot start. ${error.message}`;
  rootElement.replaceChildren(message);
}
