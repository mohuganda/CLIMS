import { z } from 'zod';

import { idSchema, optionalText, parseList, type HttpClient } from '@/lib/api';

/** A lookup record: something chosen from a list and referred to by id. */
const lookupSchema = z.object({ id: idSchema, name: optionalText });

export type Lookup = z.infer<typeof lookupSchema>;

export async function listRoles(http: HttpClient, signal?: AbortSignal): Promise<Lookup[]> {
  return parseList(lookupSchema, await http.get('/roles', { signal }), 'roles');
}

export async function listOrganizationUnits(
  http: HttpClient,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  return parseList(
    lookupSchema,
    await http.get('/organizationUnits', { signal }),
    'organization units',
  );
}

export async function listUnitsOfMeasure(
  http: HttpClient,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  return parseList(lookupSchema, await http.get('/unitOfMeasures', { signal }), 'units of measure');
}
