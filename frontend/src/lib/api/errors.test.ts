import { describe, expect, it } from 'vitest';

import { ApiError, errorFromResponse, getErrorMessage, toApiError } from './errors';

describe('errorFromResponse', () => {
  it('uses the server message for a client error', () => {
    const error = errorFromResponse(422, { message: '  Batch number already used  ' });
    expect(error.message).toBe('Batch number already used');
  });

  it('never surfaces a server-error body, which can carry internals', () => {
    const error = errorFromResponse(500, {
      message: 'SQLSTATE[42S02]: Base table or view not found: clims.users',
    });
    expect(error.message).not.toContain('SQLSTATE');
    expect(error.kind).toBe('server');
  });

  it.each([
    { name: 'no body', body: undefined },
    { name: 'an HTML error page', body: '<html>502 Bad Gateway</html>' },
    { name: 'a blank message', body: { message: '   ' } },
    { name: 'a non-string message', body: { message: { detail: 'x' } } },
  ])('falls back to a generic message for $name', ({ body }) => {
    const error = errorFromResponse(403, body);
    expect(error.message).toBe('You do not have permission to do that.');
  });

  it('truncates an oversized server message', () => {
    const error = errorFromResponse(400, { message: 'x'.repeat(5_000) });
    expect(error.message.length).toBeLessThanOrEqual(301);
    expect(error.message.endsWith('…')).toBe(true);
  });

  it('reads Laravel-style field errors', () => {
    const error = errorFromResponse(422, {
      message: 'The given data was invalid.',
      errors: { email: ['The email has already been taken.'], phone_number: ['Too short', ''] },
    });
    expect(error.fieldErrors).toEqual({
      email: ['The email has already been taken.'],
      phone_number: ['Too short'],
    });
  });

  it('reads field errors from the Go API `error` object, including bare strings', () => {
    const error = errorFromResponse(422, {
      success: false,
      message: 'validation failed',
      error: { email: 'must be a valid email' },
    });
    expect(error.fieldErrors).toEqual({ email: ['must be a valid email'] });
  });

  it('ignores field errors that are not strings', () => {
    const error = errorFromResponse(422, { errors: { email: [42, null], name: {} } });
    expect(error.fieldErrors).toEqual({});
  });
});

describe('toApiError', () => {
  it('returns an ApiError unchanged', () => {
    const original = new ApiError({ kind: 'conflict', message: 'Duplicate' });
    expect(toApiError(original)).toBe(original);
  });

  it.each([
    { name: 'a plain Error', thrown: new Error('boom') },
    { name: 'a string', thrown: 'boom' },
    { name: 'undefined', thrown: undefined },
  ])('wraps $name as unknown without leaking its text', ({ thrown }) => {
    const error = toApiError(thrown);
    expect(error.kind).toBe('unknown');
    expect(error.message).not.toContain('boom');
    expect(error.cause).toBe(thrown);
  });
});

describe('getErrorMessage', () => {
  it('gives a user-safe message for any thrown value', () => {
    expect(
      getErrorMessage(new TypeError("Cannot read properties of undefined (reading 'x')")),
    ).toBe('Something went wrong. Try again.');
  });
});
