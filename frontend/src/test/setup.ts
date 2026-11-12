import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pages are lazily imported, so a route change is an async module load plus a
// render. The 1s default is too tight for that on a loaded CI runner.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});

/*
 * jsdom has no layout engine. These are the browser APIs the UI kit probes for
 * on mount; each stand-in does nothing, which is what "no layout" means.
 */
const noop = (): void => undefined;

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'ResizeObserver', {
  configurable: true,
  value: class {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  },
});

Object.assign(Element.prototype, {
  scrollIntoView: noop,
  hasPointerCapture: () => false,
  releasePointerCapture: noop,
});
