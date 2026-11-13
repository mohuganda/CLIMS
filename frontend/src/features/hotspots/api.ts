import { z } from 'zod';

import { idSchema, optionalNumber, optionalText, parseList, type HttpClient } from '@/lib/api';

/**
 * The API spells longitude "longtitude". That spelling is its contract, so it
 * is used on the wire and nowhere else: responses are mapped to `longitude`
 * here and requests mapped back in `toWire`.
 */
const hotspotSchema = z
  .object({
    id: idSchema,
    hotspot_name: optionalText,
    contact_person_name: optionalText,
    contact_person_telephone: optionalText,
    latitude: optionalNumber,
    longtitude: optionalNumber,
    organization_unit_id: optionalNumber,
    hotspot_status: optionalText,
  })
  .transform(({ longtitude, ...rest }) => ({ ...rest, longitude: longtitude }));

export type Hotspot = z.infer<typeof hotspotSchema>;

export interface HotspotInput {
  hotspot_name: string;
  contact_person_name: string;
  contact_person_telephone: string;
  latitude: number;
  longitude: number;
  organization_unit_id: string;
  hotspot_status: string;
}

function toWire({ longitude, ...rest }: HotspotInput) {
  return { ...rest, longtitude: longitude };
}

export async function listHotspots(http: HttpClient, signal?: AbortSignal): Promise<Hotspot[]> {
  return parseList(hotspotSchema, await http.get('/hotSpots', { signal }), 'hotspots');
}

export async function createHotspot(http: HttpClient, input: HotspotInput): Promise<void> {
  await http.post('/hotSpots', toWire(input));
}

export async function updateHotspot(
  http: HttpClient,
  id: number,
  input: HotspotInput,
): Promise<void> {
  await http.put(`/hotSpots/${id}`, toWire(input));
}

export async function deleteHotspot(http: HttpClient, id: number): Promise<void> {
  await http.delete(`/hotSpots/${id}`);
}

export interface MappableHotspot extends Hotspot {
  latitude: number;
  longitude: number;
}

/**
 * The hotspots that can be drawn on a map. A record with missing or
 * out-of-range coordinates is left off rather than plotted at (0, 0), which is
 * a real place in the Gulf of Guinea.
 */
export function mappableHotspots(hotspots: readonly Hotspot[]): MappableHotspot[] {
  return hotspots.filter(
    (hotspot): hotspot is MappableHotspot =>
      hotspot.latitude !== null &&
      hotspot.longitude !== null &&
      Math.abs(hotspot.latitude) <= 90 &&
      Math.abs(hotspot.longitude) <= 180 &&
      !(hotspot.latitude === 0 && hotspot.longitude === 0),
  );
}
