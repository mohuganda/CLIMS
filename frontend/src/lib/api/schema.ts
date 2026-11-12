import { z } from 'zod';

/**
 * Building blocks for response schemas. The legacy API is loosely typed:
 * numbers arrive as numbers or numeric strings and optional columns as `null`,
 * `""` or absent. These normalise each to one representation.
 */

/** A required numeric identifier. */
export const idSchema = z.coerce.number().int().nonnegative();

/** Optional text: missing, null and blank all become `null`. */
export const optionalText = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text === '' ? null : text;
  });

/** Optional number: missing, null, blank and non-numeric all become `null`. */
export const optionalNumber = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  });
