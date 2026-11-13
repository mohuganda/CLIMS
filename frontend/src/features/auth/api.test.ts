import { describe, expect, it, vi } from 'vitest';

import { ApiError, createHttpClient } from '@/lib/api';
import { createFakeAdapter } from '@/test/fakeAdapter';

import { signIn, signOut } from './api';

function setup(...script: Parameters<typeof createFakeAdapter>) {
  const { adapter, requests } = createFakeAdapter(...script);
  const onUnauthorized = vi.fn();
  const http = createHttpClient({
    baseUrl: '/api',
    getToken: () => 'old',
    onUnauthorized,
    adapter,
  });
  return { http, requests, onUnauthorized };
}

describe('signIn', () => {
  it('returns the session from a successful login', async () => {
    const { http, requests } = setup({
      status: 200,
      body: { code: '200', token: 'tok_9', user: { id: 2, username: 'okello', role: 'dcfp' } },
    });

    const session = await signIn(http, { username: 'okello', password: 'secret' });

    expect(session.token).toBe('tok_9');
    expect(session.user).toMatchObject({ id: 2, username: 'okello', role: 'dcfp' });
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/login',
      body: { username: 'okello', password: 'secret' },
    });
  });

  it('never sends a previous token with the credentials', async () => {
    const { http, requests } = setup({
      status: 200,
      body: { token: 't', user: { id: 1, username: 'u' } },
    });
    await signIn(http, { username: 'u', password: 'p' });
    expect(requests[0]?.authorization).toBeNull();
  });

  it('rejects wrong credentials reported in the legacy envelope, without ending a session', async () => {
    const { http, onUnauthorized } = setup({
      status: 200,
      body: { code: '401', message: 'Invalid username or password' },
    });

    await expect(signIn(http, { username: 'u', password: 'wrong' })).rejects.toMatchObject({
      kind: 'unauthorized',
      message: 'Invalid username or password',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('rejects a success response that carries no token', async () => {
    const { http } = setup({ status: 200, body: { code: '200', user: { id: 1, username: 'u' } } });
    const failure = signIn(http, { username: 'u', password: 'p' });
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ kind: 'unexpected_response' });
  });
});

describe('signOut', () => {
  it('posts to the logout endpoint with the current token', async () => {
    const { http, requests } = setup({ status: 200, body: {} });
    await signOut(http);
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/logout',
      authorization: 'Bearer old',
    });
  });
});
