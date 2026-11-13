import { z } from 'zod';

import { idSchema, optionalNumber, optionalText, parseList, type HttpClient } from '@/lib/api';

const inventorySchema = z.object({
  id: idSchema,
  condom_id: optionalNumber,
  quantity_in_stock: optionalNumber,
  batch_number: optionalText,
  unit_of_measure_id: optionalNumber,
  condom_unit_cost: optionalNumber,
  date_of_delivery: optionalText,
  organization_unit_id: optionalNumber,
  user_id: optionalNumber,
});

export type InventoryRecord = z.infer<typeof inventorySchema>;

/** A new delivery into stock. */
export interface InventoryInput {
  condom_id: string;
  quantity: number;
  unit_of_measure_id: string;
  unit_cost: number;
  date_of_delivery: string;
  organization_unit_id: string;
  batch_number: string;
}

/** Whether an adjustment adds stock or records stock going out. */
export const ADJUSTMENT_TYPES = ['addition', 'distribution'] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/** A change to an existing stock record. */
export interface StockAdjustment {
  quantity: number;
  unit_of_measure_id: string;
  organization_unit_id: string;
  submitted_type: AdjustmentType;
}

export async function listInventory(
  http: HttpClient,
  signal?: AbortSignal,
): Promise<InventoryRecord[]> {
  return parseList(inventorySchema, await http.get('/condomInventories', { signal }), 'inventory');
}

/** Records a delivery. `userId` is the signed-in user, who the API records as the receiver. */
export async function createInventory(
  http: HttpClient,
  input: InventoryInput,
  userId: number,
): Promise<void> {
  await http.post('/condomInventories', { ...input, user_id: userId });
}

export async function adjustInventory(
  http: HttpClient,
  id: number,
  adjustment: StockAdjustment,
): Promise<void> {
  await http.put(`/condomInventories/${id}`, adjustment);
}

export async function deleteInventory(http: HttpClient, id: number): Promise<void> {
  await http.delete(`/condomInventories/${id}`);
}
