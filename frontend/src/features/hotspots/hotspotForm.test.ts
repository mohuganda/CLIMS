import { describe, expect, it } from 'vitest';

import type { Hotspot } from './api';
import {
  hotspotFormDefaults,
  hotspotLabel,
  hotspotSchema,
  statusOptions,
  type HotspotFormInput,
} from './hotspotForm';

const valid: HotspotFormInput = {
  hotspot_name: 'Lugogo',
  contact_person_name: 'Okello James',
  contact_person_telephone: '+256 700 000002',
  latitude: '0.3295',
  longitude: '32.6016',
  organization_unit_id: '4',
  hotspot_status: 'active',
};

const hotspot: Hotspot = {
  id: 3,
  hotspot_name: 'Lugogo',
  contact_person_name: 'Okello James',
  contact_person_telephone: '0772000000',
  latitude: 0.3295,
  longitude: 32.6016,
  organization_unit_id: 4,
  hotspot_status: 'Active',
};

describe('hotspotSchema', () => {
  it('converts coordinates to numbers', () => {
    expect(hotspotSchema.parse(valid)).toMatchObject({ latitude: 0.3295, longitude: 32.6016 });
  });

  it('accepts coordinates on the equator and the prime meridian', () => {
    expect(hotspotSchema.safeParse({ ...valid, latitude: '0', longitude: '0' }).success).toBe(true);
  });

  it.each([
    { field: 'hotspot_name', value: '  ' },
    { field: 'contact_person_name', value: '' },
    { field: 'contact_person_telephone', value: 'none' },
    { field: 'latitude', value: '' },
    { field: 'latitude', value: '90.1' },
    { field: 'latitude', value: '0° 19′ N' },
    { field: 'longitude', value: '-180.5' },
    { field: 'longitude', value: '32,6016' },
    { field: 'organization_unit_id', value: '' },
    { field: 'hotspot_status', value: '' },
  ])('rejects $field = "$value"', ({ field, value }) => {
    const result = hotspotSchema.safeParse({ ...valid, [field]: value });
    expect(result.error?.issues[0]?.path[0]).toBe(field);
  });
});

describe('statusOptions', () => {
  it('offers the standard statuses for a new hotspot', () => {
    expect(statusOptions(null).map((option) => option.value)).toEqual([
      'active',
      'pending',
      'inactive',
    ]);
  });

  it('does not duplicate a standard status stored in another case', () => {
    expect(statusOptions('ACTIVE')).toHaveLength(3);
  });

  it('keeps a non-standard stored status as a choice', () => {
    expect(statusOptions('under review').at(-1)).toEqual({
      value: 'under review',
      label: 'Under review',
    });
  });

  it.each(['', '   '])('ignores a blank stored status %j', (status) => {
    expect(statusOptions(status)).toHaveLength(3);
  });
});

describe('hotspotFormDefaults', () => {
  it('is blank for a new hotspot', () => {
    expect(Object.values(hotspotFormDefaults(null)).every((value) => value === '')).toBe(true);
  });

  it('fills the form from the record, normalising a standard status', () => {
    expect(hotspotFormDefaults(hotspot)).toEqual({
      ...valid,
      contact_person_telephone: '0772000000',
    });
  });

  it('keeps zero coordinates as "0", not blank', () => {
    const onEquator = hotspotFormDefaults({ ...hotspot, latitude: 0 });
    expect(onEquator.latitude).toBe('0');
  });

  it('leaves missing coordinates blank', () => {
    const unplaced = hotspotFormDefaults({ ...hotspot, latitude: null, longitude: null });
    expect(unplaced).toMatchObject({ latitude: '', longitude: '' });
  });

  it('round-trips an edited record through validation', () => {
    expect(hotspotSchema.safeParse(hotspotFormDefaults(hotspot)).success).toBe(true);
  });
});

describe('hotspotLabel', () => {
  it('uses the name, or the id when unnamed', () => {
    expect(hotspotLabel(hotspot)).toBe('Lugogo');
    expect(hotspotLabel({ id: 8, hotspot_name: null })).toBe('Hotspot #8');
  });
});
