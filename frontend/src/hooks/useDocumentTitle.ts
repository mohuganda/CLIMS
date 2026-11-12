import { useEffect } from 'react';

const APP_NAME = 'CLIMS';

/** Sets the browser tab title so tabs, history and screen readers name the current page. */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
