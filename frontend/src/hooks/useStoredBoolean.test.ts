import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createMemoryStorage } from '@/lib/storage/jsonStorage';

import { useStoredBoolean } from './useStoredBoolean';

describe('useStoredBoolean', () => {
  it('starts from the default when nothing is stored', () => {
    const { result } = renderHook(() => useStoredBoolean(createMemoryStorage(), 'open', true));
    expect(result.current[0]).toBe(true);
  });

  it('starts from the stored value', () => {
    const storage = createMemoryStorage({ open: 'false' });
    const { result } = renderHook(() => useStoredBoolean(storage, 'open', true));
    expect(result.current[0]).toBe(false);
  });

  it.each(['"yes"', '1', 'null', '{broken'])('ignores a stored value of %s', (stored) => {
    const storage = createMemoryStorage({ open: stored });
    const { result } = renderHook(() => useStoredBoolean(storage, 'open', true));
    expect(result.current[0]).toBe(true);
  });

  it('updates state and storage together', () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useStoredBoolean(storage, 'open', true));

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(storage.getItem('open')).toBe('false');
  });
});
