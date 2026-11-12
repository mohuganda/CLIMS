import { describe, expect, it } from 'vitest';

import { ConfigError, parseConfig } from './env';

describe('parseConfig', () => {
  it.each([
    { name: 'defaults to the same-origin proxy path', input: undefined, expected: '/api' },
    { name: 'treats blank as unset', input: '   ', expected: '/api' },
    { name: 'keeps a relative path', input: '/backend/api', expected: '/backend/api' },
    { name: 'strips trailing slashes from a path', input: '/api///', expected: '/api' },
    { name: 'keeps a bare root path', input: '/', expected: '/' },
    {
      name: 'accepts https',
      input: 'https://api.example.org/v1/',
      expected: 'https://api.example.org/v1',
    },
    {
      name: 'accepts http on localhost',
      input: 'http://localhost:8080',
      expected: 'http://localhost:8080',
    },
    {
      name: 'accepts http on the IPv4 loopback',
      input: 'http://127.0.0.1:8080/api',
      expected: 'http://127.0.0.1:8080/api',
    },
  ])('$name', ({ input, expected }) => {
    expect(parseConfig({ VITE_API_BASE_URL: input }).apiBaseUrl).toBe(expected);
  });

  it.each([
    { name: 'plain http to a remote host', input: 'http://api.example.org' },
    { name: 'a non-http scheme', input: 'ftp://api.example.org' },
    { name: 'a protocol-relative URL', input: '//api.example.org' },
    { name: 'a bare hostname', input: 'api.example.org' },
    { name: 'a javascript URL', input: 'javascript:alert(1)' },
  ])('rejects $name', ({ input }) => {
    expect(() => parseConfig({ VITE_API_BASE_URL: input })).toThrow(ConfigError);
  });

  it('names the variable in the error so a deploy log is actionable', () => {
    expect(() => parseConfig({ VITE_API_BASE_URL: 'nope' })).toThrow(/VITE_API_BASE_URL/);
  });

  it('reports a missing maps key as null rather than an empty string', () => {
    expect(parseConfig({}).googleMapsApiKey).toBeNull();
    expect(parseConfig({ VITE_GOOGLE_MAPS_API_KEY: '  ' }).googleMapsApiKey).toBeNull();
    expect(parseConfig({ VITE_GOOGLE_MAPS_API_KEY: ' key-123 ' }).googleMapsApiKey).toBe('key-123');
  });
});
