/** The slice of the Web Storage API this app uses; lets tests pass an in-memory fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Narrows an unknown stored value to `T`, or returns `null` when it is not one. */
export type Parser<T> = (value: unknown) => T | null;

/**
 * Reads a JSON value and validates its shape.
 *
 * Storage is user-editable and survives deploys, so a value written by an older
 * build, a browser extension, or by hand must never be trusted as typed data.
 * Anything unreadable or the wrong shape reads as `null`.
 */
export function readJson<T>(storage: StorageLike, key: string, parse: Parser<T>): T | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    // Storage can throw outright (Safari private mode, disabled cookies).
    return null;
  }
  if (raw === null) return null;

  try {
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Writes a JSON value. Returns `false` when the browser refused (quota, private mode). */
export function writeJson(storage: StorageLike, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Removes a key; a storage that throws is treated as already empty. */
export function removeKey(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** In-memory `StorageLike`, used when the browser's storage is unavailable and in tests. */
export function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}
