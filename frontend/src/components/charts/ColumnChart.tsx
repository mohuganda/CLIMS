import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatNumber } from '@/lib/format';

import { ChartCard, type ChartRow, type ChartSeries } from './ChartCard';

interface ColumnChartProps {
  title: string;
  description: string;
  /** One series: the card title names it, so there is no legend. */
  series: ChartSeries;
  rows: readonly ChartRow[];
  categoryLabel: string;
  isSample?: boolean;
  className?: string;
}

/** Magnitude across a handful of categories: thin columns from a shared baseline. */
export function ColumnChart({ series, rows, ...card }: ColumnChartProps) {
  const config: ChartConfig = { [series.key]: { label: series.label, color: series.color } };
  const data = rows.map((row) => ({ label: row.label, ...row.values }));

  return (
    <ChartCard series={[series]} rows={rows} {...card}>
      <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)' }}
            content={<ChartTooltipContent hideIndicator />}
          />
          <Bar
            dataKey={series.key}
            fill={`var(--color-${series.key})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
