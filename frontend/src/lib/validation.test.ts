import { describe, expect, it } from 'vitest';

import { decimalNumber, pastOrPresentDate, toDateInputValue, wholeNumber } from './validation';

const quantity = wholeNumber('a quantity', { min: 1, max: 1_000_000 });
const latitude = decimalNumber('a latitude', { min: -90, max: 90 });

describe('wholeNumber', () => {
  it.each([
    { input: '1', expected: 1 },
    { input: ' 250 ', expected: 250 },
    { input: '1000000', expected: 1_000_000 },
    { input: '007', expected: 7 },
  ])('parses "$input"', ({ input, expected }) => {
    expect(quantity.parse(input)).toBe(expected);
  });

  it.each(['', '   ', '0', '-5', '1.5', '1e3', '12abc', '1,000', '1000001', 'NaN', '٣'])(
    'rejects "%s"',
    (input) => {
      expect(quantity.safeParse(input).success).toBe(false);
    },
  );

  it('says what to enter when left blank', () => {
    expect(quantity.safeParse('').error?.issues[0]?.message).toBe('Enter a quantity.');
  });
});

describe('decimalNumber', () => {
  it.each([
    { input: '0.3136', expected: 0.3136 },
    { input: '-1.3546', expected: -1.3546 },
    { input: '90', expected: 90 },
    { input: '-90', expected: -90 },
    { input: '0', expected: 0 },
  ])('parses "$input"', ({ input, expected }) => {
    expect(latitude.parse(input)).toBe(expected);
  });

  it.each(['', '90.0001', '-91', '0,3136', '.5', '5.', '1e2', 'north', '--1', '0.3.1'])(
    'rejects "%s"',
    (input) => {
      expect(latitude.safeParse(input).success).toBe(false);
    },
  );
});

describe('pastOrPresentDate', () => {
  const delivery = pastOrPresentDate('a delivery date', () => new Date(2026, 10, 12, 15, 30));

  it.each(['2026-11-12', '2026-11-11', '2024-02-29', '1999-01-01'])('accepts %s', (value) => {
    expect(delivery.safeParse(value).success).toBe(true);
  });

  it.each([
    { name: 'blank', value: '' },
    { name: 'tomorrow', value: '2026-11-13' },
    { name: 'a later year', value: '2027-01-01' },
    { name: '31 February', value: '2026-02-31' },
    { name: '29 February in a non-leap year', value: '2025-02-29' },
    { name: 'month 13', value: '2026-13-01' },
    { name: 'a slash-separated date', value: '12/11/2026' },
    { name: 'a timestamp', value: '2026-11-12T10:00:00Z' },
  ])('rejects $name', ({ value }) => {
    expect(delivery.safeParse(value).success).toBe(false);
  });
});

describe('toDateInputValue', () => {
  it('pads the month and day', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local calendar day, not UTC', () => {
    expect(toDateInputValue(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});
