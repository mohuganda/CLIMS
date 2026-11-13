import { describe, expect, it } from 'vitest';

import { createTestHttp } from '@/test/testHttp';

import { adjustInventory, createInventory, deleteInventory, listInventory } from './api';
import { adjustmentSchema, deliverySchema } from './inventoryForm';

describe('inventory API', () => {
  it('reads quantities and costs as numbers whether sent as numbers or strings', async () => {
    const { http } = createTestHttp({
      status: 200,
      body: [
        { id: 1, quantity_in_stock: '1250000', condom_unit_cost: 350.5, batch_number: 'PR-1' },
        { id: 2, quantity_in_stock: 0, condom_unit_cost: 'n/a', batch_number: null },
      ],
    });

    const [first, second] = await listInventory(http);

    expect(first).toMatchObject({ quantity_in_stock: 1250000, condom_unit_cost: 350.5 });
    // Zero stock is a real figure and must not read as "unknown".
    expect(second).toMatchObject({ quantity_in_stock: 0, condom_unit_cost: null });
  });

  it('records a delivery against the signed-in user', async () => {
    const { http, requests } = createTestHttp({ status: 200, body: { code: '201' } });
    const delivery = deliverySchema.parse({
      condom_id: '1',
      batch_number: ' PR-2026-0412 ',
      quantity: '5000',
      unit_of_measure_id: '2',
      unit_cost: '350.5',
      date_of_delivery: '2026-01-15',
      organization_unit_id: '3',
    });

    await createInventory(http, delivery, 42);

    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/condomInventories',
      body: { batch_number: 'PR-2026-0412', quantity: 5000, unit_cost: 350.5, user_id: 42 },
    });
  });

  it('adjusts and deletes a record by id', async () => {
    const { http, requests } = createTestHttp({ status: 200, body: { code: '201' } });

    await adjustInventory(http, 7, {
      quantity: 200,
      unit_of_measure_id: '2',
      organization_unit_id: '3',
      submitted_type: 'distribution',
    });
    await deleteInventory(http, 7);

    expect(requests[0]).toMatchObject({
      method: 'PUT',
      url: '/condomInventories/7',
      body: { quantity: 200, submitted_type: 'distribution' },
    });
    expect(requests[1]).toMatchObject({ method: 'DELETE', url: '/condomInventories/7' });
  });
});

describe('deliverySchema', () => {
  const valid = {
    condom_id: '1',
    batch_number: 'PR-1',
    quantity: '100',
    unit_of_measure_id: '2',
    unit_cost: '0',
    date_of_delivery: '2026-01-15',
    organization_unit_id: '3',
  };

  it('accepts a free item (unit cost of zero)', () => {
    expect(deliverySchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    { field: 'condom_id', value: '' },
    { field: 'batch_number', value: '   ' },
    { field: 'quantity', value: '0' },
    { field: 'quantity', value: '-10' },
    { field: 'quantity', value: '12.5' },
    { field: 'quantity', value: '100000001' },
    { field: 'unit_cost', value: '-1' },
    { field: 'unit_cost', value: 'free' },
    { field: 'date_of_delivery', value: '2999-01-01' },
    { field: 'organization_unit_id', value: '' },
  ])('rejects $field = "$value"', ({ field, value }) => {
    const result = deliverySchema.safeParse({ ...valid, [field]: value });
    expect(result.error?.issues[0]?.path[0]).toBe(field);
  });
});

describe('adjustmentSchema', () => {
  const valid = {
    submitted_type: 'addition',
    quantity: '50',
    unit_of_measure_id: '2',
    organization_unit_id: '3',
  };

  it('accepts both kinds of adjustment', () => {
    expect(adjustmentSchema.safeParse(valid).success).toBe(true);
    expect(adjustmentSchema.safeParse({ ...valid, submitted_type: 'distribution' }).success).toBe(
      true,
    );
  });

  it.each(['', 'transfer', 'ADDITION'])('rejects the adjustment type "%s"', (type) => {
    const result = adjustmentSchema.safeParse({ ...valid, submitted_type: type });
    expect(result.error?.issues[0]?.message).toBe('Choose what kind of change this is.');
  });
});
