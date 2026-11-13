export type SortDirection = 'asc' | 'desc';

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export type CellValue = string | number | null | undefined;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function isBlank(value: CellValue): value is null | undefined | '' {
  return value === null || value === undefined || value === '';
}

/**
 * Orders two cell values. Blanks always sort last regardless of direction, so
 * missing data never pushes real rows off the first page.
 */
export function compareCells(a: CellValue, b: CellValue, direction: SortDirection): number {
  const aBlank = isBlank(a);
  const bBlank = isBlank(b);
  if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;

  const order =
    typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
  return direction === 'asc' ? order : -order;
}

/** Returns a sorted copy. Stable: rows that compare equal keep their order. */
export function sortRows<Row>(
  rows: readonly Row[],
  sort: SortState | null,
  getValue: (row: Row, columnId: string) => CellValue,
): Row[] {
  if (!sort) return [...rows];
  const { columnId, direction } = sort;
  return [...rows].sort((a, b) =>
    compareCells(getValue(a, columnId), getValue(b, columnId), direction),
  );
}

/** Lower-cases and strips diacritics so "Kabale" matches "kabalé". */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Keeps rows where every word of the query appears somewhere in the row's values. */
export function filterRows<Row>(
  rows: readonly Row[],
  query: string,
  getValues: (row: Row) => readonly CellValue[],
): Row[] {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...rows];

  return rows.filter((row) => {
    const haystack = normalise(
      getValues(row)
        .filter((value) => !isBlank(value))
        .join(' '),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

export interface Page<Row> {
  rows: Row[];
  /** 1-based, clamped into range. */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first and last row shown; both 0 when empty. */
  from: number;
  to: number;
}

/** Slices one page out of `rows`. An out-of-range page is clamped, never empty. */
export function paginate<Row>(rows: readonly Row[], page: number, pageSize: number): Page<Row> {
  const size = Math.max(1, Math.floor(pageSize));
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  const slice = rows.slice(start, start + size);

  return {
    rows: slice,
    page: current,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
}

/**
 * The page links to render: always the first and last page, the current page
 * with one neighbour either side, and `'gap'` where pages are skipped.
 */
export function pageLinks(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const shown = new Set([1, pageCount, page - 1, page, page + 1]);
  // Near either end, show a run of five so the control does not change width.
  if (page <= 4) for (let n = 1; n <= 5; n += 1) shown.add(n);
  if (page >= pageCount - 3) for (let n = pageCount - 4; n <= pageCount; n += 1) shown.add(n);

  const links: (number | 'gap')[] = [];
  let previous = 0;
  for (const n of [...shown].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)) {
    if (n - previous > 1) links.push('gap');
    links.push(n);
    previous = n;
  }
  return links;
}

/** Cycles a column through ascending, descending, then unsorted. */
export function nextSort(current: SortState | null, columnId: string): SortState | null {
  if (current?.columnId !== columnId) return { columnId, direction: 'asc' };
  return current.direction === 'asc' ? { columnId, direction: 'desc' } : null;
}
