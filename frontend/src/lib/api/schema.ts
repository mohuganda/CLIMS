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

/**
 * A role as one label. The Go API sends `{ id, name, permissions }`; older
 * APIs send a role name or a numeric id. Missing or blank becomes `null`.
 */
export const roleSchema = z
  .union([
    z.string(),
    z.number(),
    z.object({ id: z.unknown().optional(), name: z.string().nullish() }),
  ])
  .nullish()
  .transform((role) => {
    if (role === null || role === undefined) return null;
    const label = typeof role === 'object' ? (role.name ?? '') : String(role);
    return label.trim() === '' ? null : label.trim();
  });
