import { describe, expect, it } from 'vitest';

import {
  compareCells,
  filterRows,
  nextSort,
  pageLinks,
  paginate,
  sortRows,
  type CellValue,
} from './tableModel';

interface Row {
  id: number;
  name: string | null;
  stock: number | null;
}

const rows: Row[] = [
  { id: 1, name: 'Mbale', stock: 40 },
  { id: 2, name: null, stock: null },
  { id: 3, name: 'arua', stock: 5 },
  { id: 4, name: 'Batch 10', stock: 40 },
  { id: 5, name: 'Batch 9', stock: 120 },
];
const getValue = (row: Row, columnId: string): CellValue => row[columnId as keyof Row];
const ids = (list: Row[]) => list.map((row) => row.id);

describe('sortRows', () => {
  it('returns a copy in the original order when unsorted', () => {
    const sorted = sortRows(rows, null, getValue);
    expect(sorted).toEqual(rows);
    expect(sorted).not.toBe(rows);
  });

  it('sorts numbers numerically, not as text', () => {
    expect(ids(sortRows(rows, { columnId: 'stock', direction: 'asc' }, getValue))).toEqual([
      3, 1, 4, 5, 2,
    ]);
  });

  it('sorts text case-insensitively and treats embedded numbers as numbers', () => {
    expect(ids(sortRows(rows, { columnId: 'name', direction: 'asc' }, getValue))).toEqual([
      3, 5, 4, 1, 2,
    ]);
  });

  it('keeps blank values last in both directions', () => {
    expect(ids(sortRows(rows, { columnId: 'stock', direction: 'desc' }, getValue)).at(-1)).toBe(2);
    expect(ids(sortRows(rows, { columnId: 'stock', direction: 'asc' }, getValue)).at(-1)).toBe(2);
  });

  it('is stable for equal values', () => {
    const sorted = sortRows(rows, { columnId: 'stock', direction: 'asc' }, getValue);
    expect(ids(sorted).filter((id) => id === 1 || id === 4)).toEqual([1, 4]);
  });

  it('does not mutate its input', () => {
    const before = ids(rows);
    sortRows(rows, { columnId: 'stock', direction: 'desc' }, getValue);
    expect(ids(rows)).toEqual(before);
  });
});

describe('compareCells', () => {
  it('treats an empty string as blank', () => {
    expect(compareCells('', 'a', 'asc')).toBeGreaterThan(0);
    expect(compareCells('', 'a', 'desc')).toBeGreaterThan(0);
  });

  it('compares a number with numeric text by value', () => {
    expect(compareCells(9, '10', 'asc')).toBeLessThan(0);
  });

  it('treats two blanks as equal', () => {
    expect(compareCells(null, undefined, 'asc')).toBe(0);
  });
});

describe('filterRows', () => {
  const getValues = (row: Row): CellValue[] => [row.name, row.stock];

  it.each([
    { name: 'an empty query', query: '' },
    { name: 'a whitespace-only query', query: '   ' },
  ])('returns every row for $name', ({ query }) => {
    expect(filterRows(rows, query, getValues)).toHaveLength(rows.length);
  });

  it('matches regardless of case', () => {
    expect(ids(filterRows(rows, 'ARUA', getValues))).toEqual([3]);
  });

  it('matches numeric values', () => {
    expect(ids(filterRows(rows, '120', getValues))).toEqual([5]);
  });

  it('requires every word to match, in any column', () => {
    expect(ids(filterRows(rows, 'batch 40', getValues))).toEqual([4]);
  });

  it('ignores diacritics on both sides', () => {
    const accented = [{ id: 9, name: 'Kabalé', stock: 1 }];
    expect(filterRows(accented, 'kabale', getValues)).toHaveLength(1);
    expect(filterRows([{ id: 9, name: 'Kabale', stock: 1 }], 'kabalé', getValues)).toHaveLength(1);
  });

  it('never matches the text "null" against a missing value', () => {
    expect(filterRows(rows, 'null', getValues)).toEqual([]);
  });

  it('treats regex metacharacters as plain text', () => {
    expect(filterRows(rows, '.*', getValues)).toEqual([]);
  });
});

describe('paginate', () => {
  const list = Array.from({ length: 23 }, (_, index) => index + 1);

  it('returns the requested page with its 1-based range', () => {
    expect(paginate(list, 2, 10)).toMatchObject({
      rows: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      page: 2,
      pageCount: 3,
      total: 23,
      from: 11,
      to: 20,
    });
  });

  it('returns a short final page', () => {
    expect(paginate(list, 3, 10)).toMatchObject({ rows: [21, 22, 23], from: 21, to: 23 });
  });

  it.each([
    { name: 'beyond the last page', page: 99, expected: 3 },
    { name: 'zero', page: 0, expected: 1 },
    { name: 'negative', page: -4, expected: 1 },
    { name: 'NaN', page: Number.NaN, expected: 1 },
    { name: 'fractional', page: 2.9, expected: 2 },
  ])('clamps a page that is $name', ({ page, expected }) => {
    expect(paginate(list, page, 10).page).toBe(expected);
  });

  it('reports one empty page for no rows', () => {
    expect(paginate([], 1, 10)).toEqual({
      rows: [],
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });
  });

  it('survives a zero or negative page size', () => {
    expect(paginate(list, 1, 0).rows).toEqual([1]);
    expect(paginate(list, 1, -5).pageCount).toBe(23);
  });
});

describe('pageLinks', () => {
  it('lists every page when there are few', () => {
    expect(pageLinks(1, 1)).toEqual([1]);
    expect(pageLinks(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the far end near the start', () => {
    expect(pageLinks(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
  });

  it('collapses both sides in the middle', () => {
    expect(pageLinks(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('collapses the near end close to the last page', () => {
    expect(pageLinks(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
  });

  it('always includes the current, first and last page', () => {
    for (let page = 1; page <= 50; page += 1) {
      const links = pageLinks(page, 50);
      expect(links).toContain(page);
      expect(links[0]).toBe(1);
      expect(links.at(-1)).toBe(50);
    }
  });
});

describe('nextSort', () => {
  it('cycles ascending, descending, then unsorted', () => {
    const asc = nextSort(null, 'name');
    const desc = nextSort(asc, 'name');
    expect(asc).toEqual({ columnId: 'name', direction: 'asc' });
    expect(desc).toEqual({ columnId: 'name', direction: 'desc' });
    expect(nextSort(desc, 'name')).toBeNull();
  });

  it('starts ascending when switching to another column', () => {
    expect(nextSort({ columnId: 'name', direction: 'desc' }, 'stock')).toEqual({
      columnId: 'stock',
      direction: 'asc',
    });
  });
});
