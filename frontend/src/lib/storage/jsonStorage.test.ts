import { describe, expect, it } from 'vitest';

import {
  createMemoryStorage,
  readJson,
  removeKey,
  writeJson,
  type StorageLike,
} from './jsonStorage';

const parseCount = (value: unknown): number | null => (typeof value === 'number' ? value : null);

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
  removeItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
};

describe('readJson', () => {
  it('round-trips a value written by writeJson', () => {
    const storage = createMemoryStorage();
    expect(writeJson(storage, 'count', 3)).toBe(true);
    expect(readJson(storage, 'count', parseCount)).toBe(3);
  });

  it.each<{ name: string; stored: Record<string, string> }>([
    { name: 'a missing key', stored: {} },
    { name: 'malformed JSON', stored: { count: '{not json' } },
    { name: 'an empty string', stored: { count: '' } },
    { name: 'the wrong shape', stored: { count: '"three"' } },
    { name: 'a JSON null', stored: { count: 'null' } },
  ])('returns null for $name', ({ stored }) => {
    expect(readJson(createMemoryStorage(stored), 'count', parseCount)).toBeNull();
  });

  it('returns null when the parser itself throws', () => {
    const storage = createMemoryStorage({ count: '1' });
    expect(
      readJson(storage, 'count', () => {
        throw new Error('parser bug');
      }),
    ).toBeNull();
  });

  it('returns null when storage access is denied', () => {
    expect(readJson(throwingStorage, 'count', parseCount)).toBeNull();
  });
});

describe('writeJson', () => {
  it('reports failure instead of throwing when the quota is exceeded', () => {
    expect(writeJson(throwingStorage, 'count', 1)).toBe(false);
  });
});

describe('removeKey', () => {
  it('removes a stored value', () => {
    const storage = createMemoryStorage({ count: '1' });
    removeKey(storage, 'count');
    expect(storage.getItem('count')).toBeNull();
  });

  it('does not throw when storage access is denied', () => {
    expect(() => {
      removeKey(throwingStorage, 'count');
    }).not.toThrow();
  });
});
