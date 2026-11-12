import { vi } from 'vitest';

import { createHttpClient } from '@/lib/api';

import { createFakeAdapter } from './fakeAdapter';

/** An HTTP client wired to a scripted network, for testing feature API functions. */
export function createTestHttp(...script: Parameters<typeof createFakeAdapter>) {
  const { adapter, requests } = createFakeAdapter(...script);
  const onUnauthorized = vi.fn();
  const http = createHttpClient({
    baseUrl: '/api',
    getToken: () => 'test-token',
    onUnauthorized,
    adapter,
  });
  return { http, requests, onUnauthorized };
}
