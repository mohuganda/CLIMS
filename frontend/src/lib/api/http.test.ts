import { describe, expect, it, vi } from 'vitest';

import { createFakeAdapter } from '@/test/fakeAdapter';

import { ApiError } from './errors';
import { createHttpClient } from './http';

function setup(
  script: Parameters<typeof createFakeAdapter>,
  { token = 'token-abc' }: { token?: string | null } = {},
) {
  const { adapter, requests } = createFakeAdapter(...script);
  const onUnauthorized = vi.fn();
  const http = createHttpClient({
    baseUrl: '/api',
    getToken: () => token,
    onUnauthorized,
    adapter,
  });
  return { http, requests, onUnauthorized };
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw new Error(`expected ApiError, got ${String(error)}`, { cause: error });
  }
  throw new Error('expected the request to fail');
}

describe('createHttpClient', () => {
  it('returns the response body', async () => {
    const { http } = setup([{ status: 200, body: [{ id: 1 }] }]);
    await expect(http.get('/condoms')).resolves.toEqual([{ id: 1 }]);
  });

  it('sends the session token as a bearer header', async () => {
    const { http, requests } = setup([{ status: 200, body: [] }]);
    await http.get('/condoms');
    expect(requests[0]?.authorization).toBe('Bearer token-abc');
  });

  it('sends no authorization header when signed out', async () => {
    const { http, requests } = setup([{ status: 200, body: [] }], { token: null });
    await http.get('/condoms');
    expect(requests[0]?.authorization).toBeNull();
  });

  it('reads the token on every request, not once at creation', async () => {
    const { adapter, requests } = createFakeAdapter({ status: 200, body: [] });
    let token: string | null = 'first';
    const http = createHttpClient({
      baseUrl: '/api',
      getToken: () => token,
      onUnauthorized: vi.fn(),
      adapter,
    });

    await http.get('/a');
    token = 'second';
    await http.get('/b');
    token = null;
    await http.get('/c');

    expect(requests.map((request) => request.authorization)).toEqual([
      'Bearer first',
      'Bearer second',
      null,
    ]);
  });

  it('sends the method, path and JSON body it was given', async () => {
    const { http, requests } = setup([{ status: 200, body: {} }]);
    await http.put('/condoms/7', { brand: 'Protector' });
    expect(requests[0]).toMatchObject({
      method: 'PUT',
      url: '/condoms/7',
      body: { brand: 'Protector' },
    });
  });

  it('supports every verb the API uses', async () => {
    const { http, requests } = setup([{ status: 200, body: {} }]);

    await http.get('/a');
    await http.post('/a', { n: 1 });
    await http.put('/a/1', { n: 2 });
    await http.patch('/a/1', { n: 3 });
    await http.delete('/a/1');

    expect(requests.map((request) => request.method)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ]);
    expect(requests[3]?.body).toEqual({ n: 3 });
    expect(requests[4]?.body).toBeUndefined();
  });

  describe('anonymous requests', () => {
    it('omits the token even when one exists', async () => {
      const { http, requests } = setup([{ status: 200, body: {} }]);
      await http.post('/login', { username: 'a', password: 'b' }, { anonymous: true });
      expect(requests[0]?.authorization).toBeNull();
    });

    it('does not report a 401 as an expired session', async () => {
      const { http, onUnauthorized } = setup([{ status: 401, body: { message: 'Bad password' } }]);
      const error = await captureError(http.post('/login', {}, { anonymous: true }));
      expect(error.kind).toBe('unauthorized');
      expect(error.message).toBe('Bad password');
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    it('reports an expired session exactly once per rejected request', async () => {
      const { http, onUnauthorized } = setup([{ status: 401, body: {} }]);
      const error = await captureError(http.get('/users'));
      expect(error.kind).toBe('unauthorized');
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it.each([
      { status: 400, kind: 'validation' },
      { status: 403, kind: 'forbidden' },
      { status: 404, kind: 'not_found' },
      { status: 409, kind: 'conflict' },
      { status: 422, kind: 'validation' },
      { status: 429, kind: 'rate_limited' },
      { status: 500, kind: 'server' },
      { status: 503, kind: 'server' },
    ])('maps HTTP $status to "$kind"', async ({ status, kind }) => {
      const { http, onUnauthorized } = setup([{ status, body: {} }]);
      const error = await captureError(http.get('/x'));
      expect(error.kind).toBe(kind);
      expect(error.status).toBe(status);
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('tells a dropped connection apart from a slow server', async () => {
      const offline = setup([{ failure: 'network' }]);
      const slow = setup([{ failure: 'timeout' }]);
      expect((await captureError(offline.http.get('/x'))).kind).toBe('network');
      expect((await captureError(slow.http.get('/x'))).kind).toBe('timeout');
    });

    it('reports an aborted request as cancelled', async () => {
      const { http } = setup([{ status: 200, body: [] }]);
      const controller = new AbortController();
      controller.abort();
      const error = await captureError(http.get('/x', { signal: controller.signal }));
      expect(error.kind).toBe('cancelled');
    });
  });

  describe('legacy envelope (HTTP 200 with a failing `code`)', () => {
    it('throws for a string code of 401 and reports the expired session', async () => {
      const { http, onUnauthorized } = setup([
        { status: 200, body: { code: '401', message: 'Unauthenticated.' } },
      ]);
      const error = await captureError(http.get('/users'));
      expect(error.kind).toBe('unauthorized');
      expect(error.status).toBe(401);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('throws for a numeric code of 422', async () => {
      const { http } = setup([{ status: 200, body: { code: 422, message: 'Brand is required' } }]);
      const error = await captureError(http.post('/condoms', {}));
      expect(error.kind).toBe('validation');
      expect(error.message).toBe('Brand is required');
    });

    it.each([
      { name: 'a success code', body: { code: '201', id: 3 } },
      { name: 'a non-numeric code', body: { code: 'CONDOM-12', id: 3 } },
      { name: 'a code outside the HTTP range', body: { code: 9001, id: 3 } },
      { name: 'a list of records that have a code field', body: [{ code: '500' }] },
    ])('passes through $name', async ({ body }) => {
      const { http } = setup([{ status: 200, body }]);
      await expect(http.get('/x')).resolves.toEqual(body);
    });
  });
});
