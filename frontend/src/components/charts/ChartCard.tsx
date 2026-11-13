import { ChartNoAxesColumn, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { SampleBadge } from '@/components/SampleData';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ChartSeries {
  /** Key of this series' value in each data row. */
  key: string;
  label: string;
  /** A CSS colour, normally a `var(--chart-n)` token. */
  color: string;
}

export interface ChartRow {
  /** The category on the x-axis, e.g. a month. */
  label: string;
  values: Readonly<Record<string, number>>;
}

interface ChartCardProps {
  title: string;
  description: string;
  series: readonly ChartSeries[];
  rows: readonly ChartRow[];
  /** Header of the first table column, e.g. "Month". */
  categoryLabel: string;
  isSample?: boolean;
  className?: string;
  /** The chart itself; shown unless the reader switches to the table. */
  children: ReactNode;
}

/**
 * The frame every chart sits in: title, legend, and a switch to the same
 * figures as a table, so no value is reachable only by hovering.
 */
export function ChartCard({
  title,
  description,
  series,
  rows,
  categoryLabel,
  isSample = false,
  className,
  children,
}: ChartCardProps) {
  const [isTable, setIsTable] = useState(false);

  return (
    <section className={cn('bg-card flex min-w-0 flex-col rounded-xl border p-5', className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{title}</h2>
            {isSample ? <SampleBadge /> : null}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          {series.length > 1 ? (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {series.map((item) => (
                <li key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={isTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
            aria-pressed={isTable}
            onClick={() => {
              setIsTable((current) => !current);
            }}
          >
            {isTable ? <ChartNoAxesColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {isTable ? (
        <div className="max-h-72 overflow-auto">
          <Table aria-label={title}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{categoryLabel}</TableHead>
                {series.map((item) => (
                  <TableHead key={item.key} className="text-right">
                    {item.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  {series.map((item) => (
                    <TableCell key={item.key} className="text-right tabular-nums">
                      {formatNumber(row.values[item.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
