import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { exportToExcel, type ExportColumn } from '@/lib/export/excel';

interface ExportButtonProps<Row> {
  /** Used for the file name, e.g. "Users" gives `clims-users-<date>.xlsx`. */
  name: string;
  columns: readonly ExportColumn<Row>[];
  rows: readonly Row[] | undefined;
}

/** Downloads the table's rows as an Excel file. */
export function ExportButton<Row>({ name, columns, rows }: ExportButtonProps<Row>) {
  const [isExporting, setIsExporting] = useState(false);
  const hasRows = (rows?.length ?? 0) > 0;

  const handleExport = async () => {
    if (!rows) return;
    setIsExporting(true);
    try {
      await exportToExcel(name, columns, rows);
    } catch (error) {
      console.error('Excel export failed', error);
      toast.error('Could not create the Excel file. Try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      disabled={!hasRows || isExporting}
      title={hasRows ? undefined : 'There is nothing to export yet'}
      onClick={handleExport}
    >
      {isExporting ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}
      Export Excel
    </Button>
  );
}
