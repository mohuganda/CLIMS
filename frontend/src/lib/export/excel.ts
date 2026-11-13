import type { CellValue } from '@/lib/table/tableModel';

export interface ExportColumn<Row> {
  header: string;
  value: (row: Row) => CellValue;
}

/** `clims-<name>-YYYY-MM-DD.xlsx`, with the name reduced to filename-safe characters. */
export function exportFileName(name: string, now: Date): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export';
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `clims-${slug}-${day}.xlsx`;
}

/** A spreadsheet cell: its value and the type that tells Excel how to store it. */
export type ExportCell =
  | { value: number; type: NumberConstructor }
  | { value: string; type: StringConstructor }
  | { value: undefined };

/**
 * Converts a table value to a typed cell. Text is always written as a string
 * cell, never as a formula, so a value such as `=HYPERLINK(...)` entered into a
 * hotspot name cannot execute when the export is opened.
 */
export function toExportCell(value: CellValue): ExportCell {
  if (value === null || value === undefined || value === '') return { value: undefined };
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { value, type: Number } : { value: undefined };
  }
  return { value, type: String };
}

/**
 * Saves `rows` as an .xlsx file. The writer is loaded on demand so it is not
 * part of the bundle every visitor downloads.
 */
export async function exportToExcel<Row>(
  name: string,
  columns: readonly ExportColumn<Row>[],
  rows: readonly Row[],
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  await writeExcelFile([...rows], {
    columns: columns.map((column) => ({
      header: { value: column.header, fontWeight: 'bold' as const },
      cell: (row: Row) => toExportCell(column.value(row)),
    })),
  }).toFile(exportFileName(name, new Date()));
}
