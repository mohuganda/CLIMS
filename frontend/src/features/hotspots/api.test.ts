import { describe, expect, it, vi } from 'vitest';

import { createHttpClient } from '@/lib/api';
import { createFakeAdapter } from '@/test/fakeAdapter';

import {
  createHotspot,
  listHotspots,
  mappableHotspots,
  updateHotspot,
  type Hotspot,
  type HotspotInput,
} from './api';

function setup(...script: Parameters<typeof createFakeAdapter>) {
  const { adapter, requests } = createFakeAdapter(...script);
  const http = createHttpClient({
    baseUrl: '/api',
    getToken: () => 'tok',
    onUnauthorized: vi.fn(),
    adapter,
  });
  return { http, requests };
}

const input: HotspotInput = {
  hotspot_name: 'Lugogo',
  contact_person_name: 'Okello James',
  contact_person_telephone: '+256700000002',
  latitude: 0.3295,
  longitude: 32.6016,
  organization_unit_id: '4',
  hotspot_status: 'active',
};

describe('listHotspots', () => {
  it('maps the API spelling "longtitude" to longitude', async () => {
    const { http } = setup({
      status: 200,
      body: [{ id: 1, hotspot_name: 'Lugogo', latitude: '0.3295', longtitude: '32.6016' }],
    });

    const [hotspot] = await listHotspots(http);

    expect(hotspot).toMatchObject({ latitude: 0.3295, longitude: 32.6016 });
    expect(hotspot).not.toHaveProperty('longtitude');
  });

  it('reads missing coordinates as null, not zero', async () => {
    const { http } = setup({ status: 200, body: [{ id: 1, latitude: '', longtitude: null }] });
    const [hotspot] = await listHotspots(http);
    expect(hotspot).toMatchObject({ latitude: null, longitude: null });
  });
});

describe('createHotspot / updateHotspot', () => {
  it('sends longitude under the spelling the API expects', async () => {
    const { http, requests } = setup({ status: 200, body: {} });

    await createHotspot(http, input);
    await updateHotspot(http, 9, input);

    for (const request of requests) {
      expect(request.body).toHaveProperty('longtitude', 32.6016);
      expect(request.body).not.toHaveProperty('longitude');
    }
    expect(requests[0]).toMatchObject({ method: 'POST', url: '/hotSpots' });
    expect(requests[1]).toMatchObject({ method: 'PUT', url: '/hotSpots/9' });
  });
});

describe('mappableHotspots', () => {
  const at = (id: number, latitude: number | null, longitude: number | null): Hotspot => ({
    id,
    hotspot_name: `Hotspot ${id}`,
    contact_person_name: null,
    contact_person_telephone: null,
    latitude,
    longitude,
    organization_unit_id: null,
    hotspot_status: null,
  });

  it('keeps hotspots with valid coordinates, including on the equator', () => {
    const kept = mappableHotspots([at(1, 0.3136, 32.5811), at(2, 0, 32.5), at(3, -1.35, 29.7)]);
    expect(kept.map((hotspot) => hotspot.id)).toEqual([1, 2, 3]);
  });

  it.each([
    { name: 'a missing latitude', hotspot: at(1, null, 32.5) },
    { name: 'a missing longitude', hotspot: at(1, 0.3, null) },
    { name: 'the (0, 0) placeholder', hotspot: at(1, 0, 0) },
    { name: 'a latitude beyond the poles', hotspot: at(1, 91, 32.5) },
    { name: 'a longitude beyond the antimeridian', hotspot: at(1, 0.3, -181) },
  ])('drops $name', ({ hotspot }) => {
    expect(mappableHotspots([hotspot])).toEqual([]);
  });
});
