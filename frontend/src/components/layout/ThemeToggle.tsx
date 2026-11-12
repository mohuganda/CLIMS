import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';

/** Switches between the light and dark themes. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
      className="text-muted-foreground hover:text-foreground"
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
