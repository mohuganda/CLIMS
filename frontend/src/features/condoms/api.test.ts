import { describe, expect, it } from 'vitest';

import { createTestHttp } from '@/test/testHttp';

import { condomLabel, createCondom, deleteCondom, listCondoms, updateCondom } from './api';

const input = { category: 'Male', brand: 'Protector', type: 'Latex', unit_of_measure_id: '2' };

describe('condoms API', () => {
  it('normalises the list', async () => {
    const { http } = createTestHttp({
      status: 200,
      body: [
        { id: '4', category: 'Male', brand: ' Protector ', type: '', unit_of_measure_id: '2' },
      ],
    });
    await expect(listCondoms(http)).resolves.toEqual([
      { id: 4, category: 'Male', brand: 'Protector', type: null, unit_of_measure_id: 2 },
    ]);
  });

  it('creates, updates and deletes at the documented endpoints', async () => {
    const { http, requests } = createTestHttp({ status: 200, body: { code: '201' } });

    await createCondom(http, input);
    await updateCondom(http, 4, input);
    await deleteCondom(http, 4);

    expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
      'POST /condoms',
      'PUT /condoms/4',
      'DELETE /condoms/4',
    ]);
    expect(requests[0]?.body).toEqual(input);
    expect(requests[1]?.body).toEqual(input);
  });

  it('rejects when the API refuses a delete in the envelope', async () => {
    const { http } = createTestHttp({
      status: 200,
      body: { code: '409', message: 'This item still has stock recorded against it.' },
    });
    await expect(deleteCondom(http, 4)).rejects.toMatchObject({
      kind: 'conflict',
      message: 'This item still has stock recorded against it.',
    });
  });
});

describe('condomLabel', () => {
  it.each([
    { condom: { id: 1, brand: 'Protector', category: 'Male' }, expected: 'Protector · Male' },
    { condom: { id: 1, brand: 'FC2', category: null }, expected: 'FC2' },
    { condom: { id: 1, brand: null, category: 'Female' }, expected: 'Female' },
    { condom: { id: 9, brand: null, category: null }, expected: 'Item #9' },
  ])('labels $condom as "$expected"', ({ condom, expected }) => {
    expect(condomLabel(condom)).toBe(expected);
  });
});
