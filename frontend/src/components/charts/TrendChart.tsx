import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatNumber } from '@/lib/format';

import { ChartCard, type ChartRow, type ChartSeries } from './ChartCard';

interface TrendChartProps {
  title: string;
  description: string;
  series: readonly ChartSeries[];
  rows: readonly ChartRow[];
  categoryLabel: string;
  isSample?: boolean;
  className?: string;
}

/** Change over time for up to a few series sharing one unit: 2px lines over a light wash. */
export function TrendChart({ series, rows, ...card }: TrendChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((item) => [item.key, { label: item.label, color: item.color }]),
  );
  const data = rows.map((row) => ({ label: row.label, ...row.values }));

  return (
    <ChartCard series={series} rows={rows} {...card}>
      <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
        <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          {series.map((item) => (
            <Area
              key={item.key}
              dataKey={item.key}
              type="monotone"
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              fill={`var(--color-${item.key})`}
              fillOpacity={0.1}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  );
}
