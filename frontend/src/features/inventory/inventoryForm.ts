import { z } from 'zod';

import { decimalNumber, pastOrPresentDate, wholeNumber } from '@/lib/validation';

import { ADJUSTMENT_TYPES } from './api';

/** Upper bounds keep a slipped keystroke from recording an absurd figure. */
const QUANTITY_RANGE = { min: 1, max: 100_000_000 };
const UNIT_COST_RANGE = { min: 0, max: 100_000_000 };

export const deliverySchema = z.object({
  condom_id: z.string().min(1, 'Choose a condom item.'),
  batch_number: z.string().trim().min(1, 'Enter the batch number.').max(100),
  quantity: wholeNumber('a quantity', QUANTITY_RANGE),
  unit_of_measure_id: z.string().min(1, 'Choose a unit of measure.'),
  unit_cost: decimalNumber('a unit cost', UNIT_COST_RANGE),
  date_of_delivery: pastOrPresentDate('the delivery date'),
  organization_unit_id: z.string().min(1, 'Choose an organisation unit.'),
});

export type DeliveryFormInput = z.input<typeof deliverySchema>;
export type DeliveryFormOutput = z.output<typeof deliverySchema>;

export const DELIVERY_FIELDS = [
  'condom_id',
  'batch_number',
  'quantity',
  'unit_of_measure_id',
  'unit_cost',
  'date_of_delivery',
  'organization_unit_id',
] as const satisfies readonly (keyof DeliveryFormInput)[];

export const adjustmentSchema = z.object({
  submitted_type: z.enum(ADJUSTMENT_TYPES, { error: 'Choose what kind of change this is.' }),
  quantity: wholeNumber('a quantity', QUANTITY_RANGE),
  unit_of_measure_id: z.string().min(1, 'Choose a unit of measure.'),
  organization_unit_id: z.string().min(1, 'Choose an organisation unit.'),
});

export type AdjustmentFormInput = z.input<typeof adjustmentSchema>;
export type AdjustmentFormOutput = z.output<typeof adjustmentSchema>;

export const ADJUSTMENT_FIELDS = [
  'submitted_type',
  'quantity',
  'unit_of_measure_id',
  'organization_unit_id',
] as const satisfies readonly (keyof AdjustmentFormInput)[];

export const ADJUSTMENT_LABELS: Record<(typeof ADJUSTMENT_TYPES)[number], string> = {
  addition: 'Addition (stock received)',
  distribution: 'Distribution (stock sent out)',
};
