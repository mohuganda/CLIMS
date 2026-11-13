import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiError } from './errors';
import { parseBody, parseList } from './parse';

const unitSchema = z.object({ id: z.coerce.number().int(), name: z.string() });

describe('parseList', () => {
  it('accepts a bare array', () => {
    expect(parseList(unitSchema, [{ id: '1', name: 'Box' }], 'units')).toEqual([
      { id: 1, name: 'Box' },
    ]);
  });

  it('accepts a `data` wrapper', () => {
    expect(parseList(unitSchema, { data: [{ id: 2, name: 'Carton' }] }, 'units')).toEqual([
      { id: 2, name: 'Carton' },
    ]);
  });

  it('accepts an empty list', () => {
    expect(parseList(unitSchema, [], 'units')).toEqual([]);
  });

  it.each([
    { name: 'null', body: null },
    { name: 'a string', body: 'oops' },
    { name: 'an object without data', body: { message: 'ok' } },
    { name: 'a data field that is not a list', body: { data: { id: 1 } } },
  ])('rejects $name', ({ body }) => {
    expect(() => parseList(unitSchema, body, 'units')).toThrow(ApiError);
  });

  it('rejects a list with one malformed record rather than rendering a partial row', () => {
    const body = [{ id: 1, name: 'Box' }, { name: 'No id' }];
    expect(() => parseList(unitSchema, body, 'units')).toThrow(ApiError);
  });
});

describe('parseBody', () => {
  it('returns the parsed value', () => {
    expect(parseBody(unitSchema, { id: 5, name: 'Piece' }, 'unit')).toEqual({
      id: 5,
      name: 'Piece',
    });
  });

  it('throws an unexpected_response error that is safe to show', () => {
    try {
      parseBody(unitSchema, { id: 'abc' }, 'unit');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).kind).toBe('unexpected_response');
      expect((error as ApiError).message).not.toContain('abc');
    }
  });
});
