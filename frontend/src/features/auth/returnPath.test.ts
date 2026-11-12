import { describe, expect, it } from 'vitest';

import { safeReturnPath } from './returnPath';

const resolve = (candidate: unknown) => safeReturnPath(candidate, '/home', '/sign-in');

describe('safeReturnPath', () => {
  it.each(['/moh/users', '/dcfp/stock?page=2', '/hotspots/map#lugogo', '/'])(
    'returns the in-app path %s',
    (path) => {
      expect(resolve(path)).toBe(path);
    },
  );

  it.each([
    { name: 'nothing', candidate: undefined },
    { name: 'null', candidate: null },
    { name: 'a non-string', candidate: { pathname: '/moh' } },
    { name: 'an empty string', candidate: '' },
    { name: 'a relative path', candidate: 'moh/users' },
    { name: 'an absolute URL', candidate: 'https://evil.example/' },
    { name: 'a protocol-relative URL', candidate: '//evil.example/' },
    { name: 'a backslash host trick', candidate: '/\\evil.example/' },
    { name: 'a javascript URL', candidate: 'javascript:alert(1)' },
    { name: 'a path with a line break', candidate: '/moh\r\nSet-Cookie: x=1' },
    { name: 'the sign-in page itself', candidate: '/sign-in' },
    { name: 'the sign-in page with a query', candidate: '/sign-in?next=/moh' },
  ])('falls back for $name', ({ candidate }) => {
    expect(resolve(candidate)).toBe('/home');
  });
});
