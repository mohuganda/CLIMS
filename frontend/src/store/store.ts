import { combineSlices, configureStore } from '@reduxjs/toolkit';

import { authSlice, sessionEnded, sessionStarted } from '@/features/auth/authSlice';
import type { SessionStore } from '@/features/auth/session';

const rootReducer = combineSlices(authSlice);

export type RootState = ReturnType<typeof rootReducer>;

interface CreateAppStoreOptions {
  sessionStore: SessionStore;
}

/**
 * Builds the Redux store. Called once from the composition root (and once per
 * test), so there is no module-level store to leak state between tests.
 */
export function createAppStore({ sessionStore }: CreateAppStoreOptions) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { auth: { session: sessionStore.load() } },
  });

  // Mirror the session to storage whenever it changes, and only then.
  let persisted = store.getState().auth.session;
  store.subscribe(() => {
    const { session } = store.getState().auth;
    if (session === persisted) return;
    persisted = session;
    if (session) sessionStore.save(session);
    else sessionStore.clear();
  });

  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];

/**
 * Keeps tabs in step: signing out (or in) in one tab applies to the others.
 * Without this a second tab keeps working on a token the user believes is gone.
 * Returns a function that stops listening.
 */
export function syncSessionAcrossTabs(
  store: AppStore,
  sessionStore: SessionStore,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
): () => void {
  const onStorage = (event: StorageEvent) => {
    // `key` is null when the whole storage area was cleared.
    if (event.key !== null && event.key !== sessionStore.key) return;
    const session = sessionStore.load();
    store.dispatch(session ? sessionStarted(session) : sessionEnded());
  };
  target.addEventListener('storage', onStorage);
  return () => {
    target.removeEventListener('storage', onStorage);
  };
}
