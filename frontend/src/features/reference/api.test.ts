import { describe, expect, it } from 'vitest';

import { createTestHttp } from '@/test/testHttp';

import { listOrganizationUnits, listRoles, listUnitsOfMeasure } from './api';
import { lookupName } from './queries';

describe('reference lists', () => {
  it.each([
    { name: 'roles', list: listRoles, url: '/roles' },
    { name: 'organisation units', list: listOrganizationUnits, url: '/organizationUnits' },
    { name: 'units of measure', list: listUnitsOfMeasure, url: '/unitOfMeasures' },
  ])('reads $name from $url', async ({ list, url }) => {
    const { http, requests } = createTestHttp({
      status: 200,
      body: [
        { id: '1', name: 'First' },
        { id: 2, name: null },
      ],
    });

    await expect(list(http)).resolves.toEqual([
      { id: 1, name: 'First' },
      { id: 2, name: null },
    ]);
    expect(requests[0]).toMatchObject({ method: 'GET', url });
  });

  it('rejects a record without an id', async () => {
    const { http } = createTestHttp({ status: 200, body: [{ name: 'Orphan' }] });
    await expect(listRoles(http)).rejects.toMatchObject({ kind: 'unexpected_response' });
  });
});

describe('lookupName', () => {
  const units = [
    { id: 1, name: 'Piece' },
    { id: 2, name: null },
  ];

  it.each([
    { name: 'a known id', id: 1, expected: 'Piece' },
    { name: 'a record with no name', id: 2, expected: '#2' },
    { name: 'an id not in the list', id: 9, expected: '#9' },
    { name: 'no id', id: null, expected: null },
  ])('resolves $name', ({ id, expected }) => {
    expect(lookupName(units, id)).toBe(expected);
  });

  it('falls back to the id while the list is still loading', () => {
    expect(lookupName(undefined, 3)).toBe('#3');
  });
});
