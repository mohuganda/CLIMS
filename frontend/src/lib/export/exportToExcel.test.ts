import { beforeEach, describe, expect, it, vi } from 'vitest';

const toFile = vi.fn(() => Promise.resolve());
const writeExcelFile = vi.fn(() => ({ toFile }));

// The real writer needs Web Workers, which jsdom does not have. What matters
// here is what this module hands to it.
vi.mock('write-excel-file/browser', () => ({ default: writeExcelFile }));

const { exportToExcel } = await import('./excel');

interface Row {
  name: string | null;
  stock: number | null;
}

const columns = [
  { header: 'Name', value: (row: Row) => row.name },
  { header: 'Stock', value: (row: Row) => row.stock },
];

beforeEach(() => {
  toFile.mockClear();
  writeExcelFile.mockClear();
});

describe('exportToExcel', () => {
  it('writes one bold header per column and saves under a dated file name', async () => {
    await exportToExcel('Condom stock', columns, [{ name: 'Lugogo', stock: 12 }]);

    const [rows, options] = writeExcelFile.mock.calls[0] as unknown as [
      Row[],
      { columns: { header: unknown; cell: (row: Row) => unknown }[] },
    ];
    expect(rows).toEqual([{ name: 'Lugogo', stock: 12 }]);
    expect(options.columns.map((column) => column.header)).toEqual([
      { value: 'Name', fontWeight: 'bold' },
      { value: 'Stock', fontWeight: 'bold' },
    ]);
    expect(toFile).toHaveBeenCalledWith(
      expect.stringMatching(/^clims-condom-stock-\d{4}-\d{2}-\d{2}\.xlsx$/),
    );
  });

  it('types each cell from its value, keeping formula-like text as text', async () => {
    await exportToExcel('Hotspots', columns, []);

    const [, options] = writeExcelFile.mock.calls[0] as unknown as [
      Row[],
      { columns: { cell: (row: Row) => unknown }[] },
    ];
    const [nameColumn, stockColumn] = options.columns;

    expect(nameColumn?.cell({ name: '=cmd|calc', stock: null })).toEqual({
      value: '=cmd|calc',
      type: String,
    });
    expect(stockColumn?.cell({ name: null, stock: 40 })).toEqual({ value: 40, type: Number });
    expect(stockColumn?.cell({ name: null, stock: null })).toEqual({ value: undefined });
  });

  it('propagates a failure so the caller can tell the user', async () => {
    toFile.mockRejectedValueOnce(new Error('disk full'));
    await expect(exportToExcel('Users', columns, [])).rejects.toThrow('disk full');
  });
});
