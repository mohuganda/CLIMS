import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { StorageLike } from '@/lib/storage/jsonStorage';

import { applyTheme, loadTheme, saveTheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  /** Where the choice is remembered. */
  storage: StorageLike;
  children: ReactNode;
}

/**
 * Holds the light/dark choice and keeps the document in step with it.
 *
 * Deliberately not `next-themes`: that library works by rendering an inline
 * script, which React 19 refuses to run on the client (and logs an error
 * about), and which a strict Content-Security-Policy would block anyway.
 */
export function ThemeProvider({ storage, children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() => loadTheme(storage));

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      saveTheme(storage, next);
    },
    [storage],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook and its provider are one unit
export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return value;
}
