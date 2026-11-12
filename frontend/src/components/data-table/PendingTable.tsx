import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable';

interface PendingTableProps {
  label: string;
  /** Column headings, in order. */
  columns: readonly string[];
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * A table whose records have no endpoint yet. It shows the intended columns and
 * an honest empty state, never invented rows.
 */
export function PendingTable({ label, columns, emptyTitle, emptyDescription }: PendingTableProps) {
  const tableColumns: DataTableColumn<never>[] = columns.map((header) => ({
    id: header,
    header,
    value: () => null,
    sortable: false,
  }));

  return (
    <DataTable<never>
      label={label}
      columns={tableColumns}
      rows={[]}
      getRowId={() => ''}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}
