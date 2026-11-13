import { describe, expect, it } from 'vitest';

import { EMPTY_VALUE, formatDate, formatNumber, formatText, initialsOf } from './format';

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('accepts numeric strings, as the API sends for decimals', () => {
    expect(formatNumber('20000')).toBe('20,000');
  });

  it('formats zero as zero, not as missing', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it.each([null, undefined, '', 'abc', Number.NaN, Number.POSITIVE_INFINITY])(
    'shows the empty marker for %s',
    (value) => {
      expect(formatNumber(value)).toBe(EMPTY_VALUE);
    },
  );
});

describe('formatDate', () => {
  it('formats a date-only value as that calendar day in any timezone', () => {
    expect(formatDate('2026-11-12')).toMatch(/12 Nov 2026|Nov 12, 2026/);
  });

  it('formats a full timestamp', () => {
    expect(formatDate('2026-03-05T10:30:00Z')).toMatch(/Mar/);
  });

  it.each([null, undefined, '', 'not a date', '2026-13-45T00:00:00Z'])(
    'shows the empty marker for %s',
    (value) => {
      expect(formatDate(value)).toBe(EMPTY_VALUE);
    },
  );
});

describe('formatText', () => {
  it('trims and passes text through', () => {
    expect(formatText('  Kampala ')).toBe('Kampala');
  });

  it('shows numbers, including zero', () => {
    expect(formatText(0)).toBe('0');
  });

  it.each([null, undefined, '', '   '])('shows the empty marker for %j', (value) => {
    expect(formatText(value)).toBe(EMPTY_VALUE);
  });
});

describe('initialsOf', () => {
  it.each([
    { name: 'Nakato Sarah', expected: 'NS' },
    { name: 'okello', expected: 'O' },
    { name: '  Jean  Paul   Mukasa ', expected: 'JM' },
    { name: 'Élodie Ñandu', expected: 'ÉÑ' },
    { name: '😀 smile', expected: '😀S' },
    { name: '👩‍⚕️ Nurse', expected: '👩‍⚕️N' },
    { name: 'e\u0301lodie', expected: 'E\u0301' },
    { name: 'Jo', expected: 'J' },
    { name: 'William Montgomery III', expected: 'WM' },
    { name: 'Okello James Jr.', expected: 'OJ' },
    { name: 'II', expected: 'I' },
    { name: '', expected: '?' },
    { name: null, expected: '?' },
    { name: undefined, expected: '?' },
  ])('gives "$expected" for $name', ({ name, expected }) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
