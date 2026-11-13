import { createMemoryStorage, type StorageLike } from './jsonStorage';

/**
 * The browser's localStorage, or an in-memory stand-in when it is unavailable.
 * Merely reading `window.localStorage` throws when storage is blocked, and the
 * app should still run for that session rather than fail to start.
 */
export function getBrowserStorage(): StorageLike {
  try {
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}
