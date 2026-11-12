import { describe, expect, it } from 'vitest';

import { exportFileName, toExportCell } from './excel';

describe('exportFileName', () => {
  const day = new Date(2026, 10, 2);

  it.each([
    { name: 'Users', expected: 'clims-users-2026-11-02.xlsx' },
    { name: 'Condom stock', expected: 'clims-condom-stock-2026-11-02.xlsx' },
    { name: '  Hotspots / Kampala  ', expected: 'clims-hotspots-kampala-2026-11-02.xlsx' },
    { name: 'Dépôt régional', expected: 'clims-depot-regional-2026-11-02.xlsx' },
    { name: '../../etc/passwd', expected: 'clims-etc-passwd-2026-11-02.xlsx' },
    { name: '***', expected: 'clims-export-2026-11-02.xlsx' },
    { name: '', expected: 'clims-export-2026-11-02.xlsx' },
  ])('turns "$name" into a safe file name', ({ name, expected }) => {
    expect(exportFileName(name, day)).toBe(expected);
  });
});

describe('toExportCell', () => {
  it('writes numbers as number cells', () => {
    expect(toExportCell(1200)).toEqual({ value: 1200, type: Number });
    expect(toExportCell(0)).toEqual({ value: 0, type: Number });
  });

  it('writes text as string cells', () => {
    expect(toExportCell('Kampala')).toEqual({ value: 'Kampala', type: String });
  });

  it.each(['=1+1', '+256700000000', '-5', '@SUM(A1:A9)', '=HYPERLINK("http://x","y")'])(
    'writes "%s" as text so a spreadsheet cannot run it as a formula',
    (value) => {
      expect(toExportCell(value)).toEqual({ value, type: String });
    },
  );

  it.each([null, undefined, '', Number.NaN, Number.POSITIVE_INFINITY])(
    'writes an empty cell for %s',
    (value) => {
      expect(toExportCell(value)).toEqual({ value: undefined });
    },
  );
});
