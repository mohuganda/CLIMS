import { z } from 'zod';

import { decimalNumber } from '@/lib/validation';

import type { Hotspot } from './api';

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export const hotspotSchema = z.object({
  hotspot_name: z.string().trim().min(1, 'Enter the hotspot name.').max(150),
  contact_person_name: z.string().trim().min(1, 'Enter the contact person.').max(150),
  contact_person_telephone: z
    .string()
    .trim()
    .min(1, 'Enter a contact phone number.')
    .regex(PHONE_PATTERN, 'Enter a phone number, e.g. +256 700 000000.'),
  latitude: decimalNumber('a latitude', { min: -90, max: 90 }),
  longitude: decimalNumber('a longitude', { min: -180, max: 180 }),
  organization_unit_id: z.string().min(1, 'Choose an organisation unit.'),
  hotspot_status: z.string().min(1, 'Choose a status.'),
});

export type HotspotFormInput = z.input<typeof hotspotSchema>;
export type HotspotFormOutput = z.output<typeof hotspotSchema>;

export const HOTSPOT_FIELDS = [
  'hotspot_name',
  'contact_person_name',
  'contact_person_telephone',
  'latitude',
  'longitude',
  'organization_unit_id',
  'hotspot_status',
] as const satisfies readonly (keyof HotspotFormInput)[];

/** The API calls longitude "longtitude"; its validation errors use that name too. */
export const HOTSPOT_SERVER_FIELD_MAP = { longtitude: 'longitude' } as const;

const STANDARD_STATUSES = ['active', 'pending', 'inactive'] as const;

/**
 * Status choices for the form. A record saved with some other status keeps it
 * as an extra option, so opening and saving a hotspot never silently rewrites it.
 */
export function statusOptions(current: string | null): { value: string; label: string }[] {
  const values: string[] = [...STANDARD_STATUSES];
  const existing = current?.trim();
  if (existing && !values.some((value) => value === existing.toLowerCase())) values.push(existing);
  return values.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }));
}

/** The form value for a stored status: the standard spelling when it is one, else as stored. */
function statusValue(current: string | null): string {
  const existing = current?.trim() ?? '';
  const standard = STANDARD_STATUSES.find((value) => value === existing.toLowerCase());
  return standard ?? existing;
}

export function hotspotFormDefaults(hotspot: Hotspot | null): HotspotFormInput {
  return {
    hotspot_name: hotspot?.hotspot_name ?? '',
    contact_person_name: hotspot?.contact_person_name ?? '',
    contact_person_telephone: hotspot?.contact_person_telephone ?? '',
    latitude:
      hotspot?.latitude === null || hotspot?.latitude === undefined ? '' : String(hotspot.latitude),
    longitude:
      hotspot?.longitude === null || hotspot?.longitude === undefined
        ? ''
        : String(hotspot.longitude),
    organization_unit_id:
      hotspot?.organization_unit_id === null || hotspot?.organization_unit_id === undefined
        ? ''
        : String(hotspot.organization_unit_id),
    hotspot_status: statusValue(hotspot?.hotspot_status ?? null),
  };
}

export function hotspotLabel(hotspot: Pick<Hotspot, 'id' | 'hotspot_name'>): string {
  return hotspot.hotspot_name ?? `Hotspot #${hotspot.id}`;
}
