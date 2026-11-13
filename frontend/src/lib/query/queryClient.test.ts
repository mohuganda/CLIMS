import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { createQueryClient, shouldRetryQuery } from './queryClient';

const errorOf = (kind: ApiError['kind']) => new ApiError({ kind, message: kind });

describe('shouldRetryQuery', () => {
  it.each(['network', 'timeout', 'server'] as const)('retries a %s failure', (kind) => {
    expect(shouldRetryQuery(0, errorOf(kind))).toBe(true);
    expect(shouldRetryQuery(1, errorOf(kind))).toBe(true);
  });

  it('gives up after two retries', () => {
    expect(shouldRetryQuery(2, errorOf('network'))).toBe(false);
  });

  it.each([
    'unauthorized',
    'forbidden',
    'not_found',
    'validation',
    'conflict',
    'rate_limited',
    'unexpected_response',
    'cancelled',
    'unknown',
  ] as const)('does not retry a %s failure, which would fail the same way', (kind) => {
    expect(shouldRetryQuery(0, errorOf(kind))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('reports a failed mutation that has no error handler of its own', async () => {
    const onMutationError = vi.fn();
    const client = createQueryClient({ onMutationError });
    const failure = errorOf('conflict');

    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(failure),
    });
    await expect(mutation.execute(undefined)).rejects.toBe(failure);

    expect(onMutationError).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('stays quiet about a cancelled mutation', async () => {
    const onMutationError = vi.fn();
    const client = createQueryClient({ onMutationError });

    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(errorOf('cancelled')),
    });
    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(ApiError);

    expect(onMutationError).not.toHaveBeenCalled();
  });

  it('leaves a mutation alone when its screen shows the failure itself', async () => {
    const onMutationError = vi.fn();
    const client = createQueryClient({ onMutationError });

    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(errorOf('unauthorized')),
      meta: { handlesOwnErrors: true },
    });
    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(ApiError);

    expect(onMutationError).not.toHaveBeenCalled();
  });

  it('never retries a mutation', async () => {
    const client = createQueryClient({ onMutationError: vi.fn() });
    const mutationFn = vi.fn(() => Promise.reject(errorOf('network')));

    const mutation = client.getMutationCache().build(client, { mutationFn });
    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(ApiError);

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
