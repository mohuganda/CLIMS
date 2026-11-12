import type { z } from 'zod';

import { unexpectedResponse } from './errors';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates a response body against a schema.
 *
 * The API is a separate deployable, so its payloads are untrusted input: a
 * shape mismatch becomes one typed error here instead of an `undefined`
 * surfacing somewhere in a table cell.
 */
export function parseBody<Schema extends z.ZodType>(
  schema: Schema,
  body: unknown,
  what: string,
): z.infer<Schema> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw unexpectedResponse(`${what}: ${result.error.issues[0]?.message ?? 'invalid shape'}`);
  }
  return result.data;
}

/**
 * Validates a list response. Accepts a bare array or a `{ data: [...] }`
 * wrapper, since the legacy endpoints return the former and paginated Laravel
 * resources the latter.
 */
export function parseList<Schema extends z.ZodType>(
  itemSchema: Schema,
  body: unknown,
  what: string,
): z.infer<Schema>[] {
  const items = Array.isArray(body) ? body : isRecord(body) ? body.data : undefined;
  if (!Array.isArray(items)) {
    throw unexpectedResponse(`${what}: expected a list`);
  }
  return items.map((item, index) => parseBody(itemSchema, item, `${what}[${index}]`));
}
