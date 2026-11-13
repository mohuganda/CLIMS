import { describe, expect, it } from 'vitest';

import { statusTone } from './status';

describe('statusTone', () => {
  it.each([
    { status: 'active', tone: 'positive' },
    { status: ' Active ', tone: 'positive' },
    { status: 'VERIFIED', tone: 'positive' },
    { status: 'pending', tone: 'caution' },
    { status: 'Pending verification', tone: 'caution' },
    { status: 'inactive', tone: 'negative' },
    { status: 'Suspended', tone: 'negative' },
  ])('shows "$status" as $tone', ({ status, tone }) => {
    expect(statusTone(status)).toBe(tone);
  });

  it.each([null, undefined, '', 'archived', 'inactive-ish', '1'])(
    'shows the unrecognised status %j as neutral',
    (status) => {
      expect(statusTone(status)).toBe('neutral');
    },
  );
});
