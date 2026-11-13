import { readJson, writeJson, type StorageLike } from '@/lib/storage/jsonStorage';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Light is the product's theme. Dark is opt-in and never follows the operating system. */
export const DEFAULT_THEME: Theme = 'light';

const THEME_KEY = 'clims.theme';

const parseTheme = (value: unknown): Theme | null =>
  THEMES.find((theme) => theme === value) ?? null;

/** The remembered theme, or the default when nothing valid is stored. */
export function loadTheme(storage: StorageLike): Theme {
  return readJson(storage, THEME_KEY, parseTheme) ?? DEFAULT_THEME;
}

export function saveTheme(storage: StorageLike, theme: Theme): void {
  writeJson(storage, THEME_KEY, theme);
}

/** Puts the theme on the root element, where the stylesheet's `.dark` rules key off it. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.classList.toggle('dark', theme === 'dark');
}
