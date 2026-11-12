import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => {
    mediaQuery.removeEventListener('change', onChange);
  };
}

/** Whether the viewport is below the tablet breakpoint. Drives the sidebar's sheet mode. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
