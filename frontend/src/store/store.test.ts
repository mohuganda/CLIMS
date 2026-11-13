import { describe, expect, it } from 'vitest';

import { sessionEnded, sessionStarted } from '@/features/auth/authSlice';
import { createSessionStore, type Session } from '@/features/auth/session';
import { createMemoryStorage } from '@/lib/storage/jsonStorage';

import { createAppStore, syncSessionAcrossTabs } from './store';

const session: Session = {
  token: 'tok_1',
  user: { id: 4, username: 'nakato', role: 'admin', firstname: null, lastname: null, email: null },
};

function setup(initial: Record<string, string> = {}) {
  const storage = createMemoryStorage(initial);
  const sessionStore = createSessionStore(storage);
  return { storage, sessionStore, store: createAppStore({ sessionStore }) };
}

describe('createAppStore', () => {
  it('starts signed out when nothing is stored', () => {
    expect(setup().store.getState().auth.session).toBeNull();
  });

  it('restores a stored session on startup', () => {
    const { store } = setup({ 'clims.session': JSON.stringify(session) });
    expect(store.getState().auth.session).toEqual(session);
  });

  it('starts signed out when the stored session is corrupted', () => {
    const { store } = setup({ 'clims.session': 'not json' });
    expect(store.getState().auth.session).toBeNull();
  });

  it('persists a new session and removes it on sign-out', () => {
    const { store, sessionStore, storage } = setup();

    store.dispatch(sessionStarted(session));
    expect(sessionStore.load()).toEqual(session);

    store.dispatch(sessionEnded());
    expect(storage.getItem('clims.session')).toBeNull();
  });

  it('gives each store its own state', () => {
    const first = setup();
    const second = setup();
    first.store.dispatch(sessionStarted(session));
    expect(second.store.getState().auth.session).toBeNull();
  });
});

describe('syncSessionAcrossTabs', () => {
  function storageEvent(key: string | null): StorageEvent {
    return new StorageEvent('storage', { key });
  }

  it('signs this tab out when another tab removes the session', () => {
    const { store, sessionStore, storage } = setup({ 'clims.session': JSON.stringify(session) });
    const target = new EventTarget() as unknown as Window;
    syncSessionAcrossTabs(store, sessionStore, target);

    storage.removeItem('clims.session');
    target.dispatchEvent(storageEvent('clims.session'));

    expect(store.getState().auth.session).toBeNull();
  });

  it('signs this tab in when another tab starts a session', () => {
    const { store, sessionStore, storage } = setup();
    const target = new EventTarget() as unknown as Window;
    syncSessionAcrossTabs(store, sessionStore, target);

    storage.setItem('clims.session', JSON.stringify(session));
    target.dispatchEvent(storageEvent('clims.session'));

    expect(store.getState().auth.session).toEqual(session);
  });

  it('signs out when the whole storage area is cleared', () => {
    const { store, sessionStore, storage } = setup({ 'clims.session': JSON.stringify(session) });
    const target = new EventTarget() as unknown as Window;
    syncSessionAcrossTabs(store, sessionStore, target);

    storage.removeItem('clims.session');
    target.dispatchEvent(storageEvent(null));

    expect(store.getState().auth.session).toBeNull();
  });

  it('ignores changes to unrelated keys', () => {
    const { store, sessionStore, storage } = setup({ 'clims.session': JSON.stringify(session) });
    const target = new EventTarget() as unknown as Window;
    syncSessionAcrossTabs(store, sessionStore, target);

    storage.removeItem('clims.session');
    target.dispatchEvent(storageEvent('theme'));

    expect(store.getState().auth.session).toEqual(session);
  });

  it('stops listening once unsubscribed', () => {
    const { store, sessionStore, storage } = setup({ 'clims.session': JSON.stringify(session) });
    const target = new EventTarget() as unknown as Window;
    const stop = syncSessionAcrossTabs(store, sessionStore, target);
    stop();

    storage.removeItem('clims.session');
    target.dispatchEvent(storageEvent('clims.session'));

    expect(store.getState().auth.session).toEqual(session);
  });
});
