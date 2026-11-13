import type { AnchorHTMLAttributes, MouseEvent } from 'react';

/*
 * A stand-in for the Next.js router, so navigation can be exercised in jsdom.
 * `setup.ts` puts it behind `next/navigation` and `next/link` for every test:
 * components call the real hooks and render real links, and what they do is
 * recorded here instead of loading a page.
 */

let url = new URL('http://localhost/');
const listeners = new Set<() => void>();

function navigate(href: string): void {
  url = new URL(href, url);
  listeners.forEach((listener) => {
    listener();
  });
}

export const testRouter = {
  /** The current address: path and query string. */
  get location(): string {
    return `${url.pathname}${url.search}`;
  },
  get pathname(): string {
    return url.pathname;
  },
  get search(): string {
    return url.search;
  },
  /** Puts the router at `href` without notifying anyone; call before rendering. */
  reset(href = '/'): void {
    url = new URL(href, 'http://localhost/');
    listeners.clear();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  push: navigate,
  replace: navigate,
};

// One object for the life of the test run: the real hook's result is stable
// too, and effects that list the router as a dependency rely on that.
export const appRouter = {
  push: testRouter.push,
  replace: testRouter.replace,
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  prefetch: () => undefined,
};

type TestLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

/** What `next/link` renders in tests: an anchor that navigates the test router. */
export function TestLink({ href, onClick, children, ...rest }: TestLinkProps) {
  return (
    <a
      href={href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        testRouter.push(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
