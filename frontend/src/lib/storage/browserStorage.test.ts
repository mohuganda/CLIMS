import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBrowserStorage } from './browserStorage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getBrowserStorage', () => {
  it('returns the browser storage when it is available', () => {
    expect(getBrowserStorage()).toBe(window.localStorage);
  });

  it('falls back to a working in-memory storage when the browser blocks access', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    const storage = getBrowserStorage();
    storage.setItem('key', 'value');

    expect(storage.getItem('key')).toBe('value');
  });
});
