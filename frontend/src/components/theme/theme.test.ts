import { describe, expect, it } from 'vitest';

import { createMemoryStorage } from '@/lib/storage/jsonStorage';

import { applyTheme, loadTheme, saveTheme } from './theme';

describe('loadTheme', () => {
  it('defaults to light when nothing is stored', () => {
    expect(loadTheme(createMemoryStorage())).toBe('light');
  });

  it('returns what was saved', () => {
    const storage = createMemoryStorage();
    saveTheme(storage, 'dark');
    expect(loadTheme(storage)).toBe('dark');
  });

  it.each(['"system"', '"DARK"', 'dark', '{"theme":"dark"}', '42'])(
    'falls back to light for the stored value %s',
    (stored) => {
      expect(loadTheme(createMemoryStorage({ 'clims.theme': stored }))).toBe('light');
    },
  );
});

describe('applyTheme', () => {
  it('adds the dark class for dark and removes it for light', () => {
    const root = document.createElement('html');

    applyTheme(root, 'dark');
    expect(root.classList.contains('dark')).toBe(true);

    applyTheme(root, 'light');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('leaves other classes on the root alone', () => {
    const root = document.createElement('html');
    root.className = 'no-js';
    applyTheme(root, 'dark');
    expect(root.className).toBe('no-js dark');
  });
});
