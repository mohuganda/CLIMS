import { describe, expect, it } from 'vitest';

import { mapSummary } from './mapSummary';

describe('mapSummary', () => {
  it.each([
    { onMap: 0, total: 0, expected: 'There are no hotspots yet. Add one under Hotspots.' },
    { onMap: 1, total: 1, expected: '1 of 1 hotspot is on the map.' },
    { onMap: 3, total: 3, expected: '3 of 3 hotspots are on the map.' },
    {
      onMap: 3,
      total: 4,
      expected:
        '3 of 4 hotspots are on the map. 1 has no usable coordinates; add them under Hotspots.',
    },
    {
      onMap: 0,
      total: 2,
      expected:
        '0 of 2 hotspots are on the map. 2 have no usable coordinates; add them under Hotspots.',
    },
    {
      onMap: 1200,
      total: 1284,
      expected:
        '1,200 of 1,284 hotspots are on the map. 84 have no usable coordinates; add them under Hotspots.',
    },
  ])('describes $onMap of $total', ({ onMap, total, expected }) => {
    expect(mapSummary(onMap, total)).toBe(expected);
  });
});
