import { z } from 'zod';

import { idSchema, optionalNumber, optionalText, parseList, type HttpClient } from '@/lib/api';

const condomSchema = z.object({
  id: idSchema,
  category: optionalText,
  brand: optionalText,
  type: optionalText,
  unit_of_measure_id: optionalNumber,
});

export type Condom = z.infer<typeof condomSchema>;

export interface CondomInput {
  category: string;
  brand: string;
  type: string;
  unit_of_measure_id: string;
}

export async function listCondoms(http: HttpClient, signal?: AbortSignal): Promise<Condom[]> {
  return parseList(condomSchema, await http.get('/condoms', { signal }), 'condoms');
}

export async function createCondom(http: HttpClient, input: CondomInput): Promise<void> {
  await http.post('/condoms', input);
}

export async function updateCondom(
  http: HttpClient,
  id: number,
  input: CondomInput,
): Promise<void> {
  await http.put(`/condoms/${id}`, input);
}

export async function deleteCondom(http: HttpClient, id: number): Promise<void> {
  await http.delete(`/condoms/${id}`);
}

/** A one-line name for a condom item, for pickers and confirmations. */
export function condomLabel(condom: Pick<Condom, 'id' | 'brand' | 'category'>): string {
  const parts = [condom.brand, condom.category].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : `Item #${condom.id}`;
}
