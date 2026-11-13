import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

import { appRouter, TestLink, testRouter } from './navigation';

// A route change is a redirect effect plus a render of a whole screen. The 1s
// default is too tight for that on a loaded CI runner.
configure({ asyncUtilTimeout: 5000 });

/*
 * Next.js supplies its router from the framework, which is not running here.
 * These stand-ins keep the same hooks and the same <Link>, backed by an
 * in-memory address (see ./navigation).
 */
vi.mock('next/navigation', () => ({
  useRouter: () => appRouter,
  usePathname: () => useSyncExternalStore(testRouter.subscribe, () => testRouter.pathname),
  useSearchParams: () => {
    const search = useSyncExternalStore(testRouter.subscribe, () => testRouter.search);
    return new URLSearchParams(search);
  },
  redirect: (href: string) => {
    throw new Error(`redirect("${href}") runs on the server and cannot be rendered in a test.`);
  },
  notFound: () => {
    throw new Error('notFound() runs on the server and cannot be rendered in a test.');
  },
}));

vi.mock('next/link', () => ({ default: TestLink }));

beforeEach(() => {
  testRouter.reset();
});

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
