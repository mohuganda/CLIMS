import { describe, expect, it } from 'vitest';

import { toPercentages } from './percent';

describe('toPercentages', () => {
  it.each([
    { values: [65, 35], expected: [65, 35] },
    { values: [1, 1], expected: [50, 50] },
    { values: [1, 3], expected: [25, 75] },
    { values: [5], expected: [100] },
    { values: [0, 10], expected: [0, 100] },
  ])('turns $values into $expected', ({ values, expected }) => {
    expect(toPercentages(values)).toEqual(expected);
  });

  it('gives zeros rather than NaN when everything is zero', () => {
    expect(toPercentages([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('returns an empty list for no values', () => {
    expect(toPercentages([])).toEqual([]);
  });

  it('counts a negative value as zero', () => {
    expect(toPercentages([-5, 10])).toEqual([0, 100]);
  });
});
