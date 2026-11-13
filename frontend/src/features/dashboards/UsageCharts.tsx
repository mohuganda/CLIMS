import { ColumnChart } from '@/components/charts/ColumnChart';
import { ShareList } from '@/components/charts/ShareList';
import { TrendChart } from '@/components/charts/TrendChart';

import {
  SAMPLE_GENDER_SPLIT,
  SAMPLE_MONTHLY_MOVEMENT,
  SAMPLE_WEEKLY_DISTRIBUTION,
} from './sampleData';

const MOVEMENT_SERIES = [
  { key: 'received', label: 'Received', color: 'var(--chart-1)' },
  { key: 'dispatched', label: 'Dispatched', color: 'var(--chart-2)' },
];

/** The three usage charts shared by the dashboards. All three draw sample data. */
export function UsageCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <TrendChart
        className="lg:col-span-2"
        title="Condoms received and dispatched"
        description="Monthly totals"
        categoryLabel="Month"
        series={MOVEMENT_SERIES}
        rows={SAMPLE_MONTHLY_MOVEMENT}
        isSample
      />
      <ShareList
        title="Distribution by gender"
        description="Share of condoms distributed"
        totalLabel="Total distributed"
        shares={[
          { label: 'Male', value: SAMPLE_GENDER_SPLIT.male, color: 'var(--chart-1)' },
          { label: 'Female', value: SAMPLE_GENDER_SPLIT.female, color: 'var(--chart-2)' },
        ]}
        isSample
      />
      <ColumnChart
        className="lg:col-span-3"
        title="Condoms distributed this week"
        description="Daily totals"
        categoryLabel="Day"
        series={{ key: 'distributed', label: 'Distributed', color: 'var(--chart-1)' }}
        rows={SAMPLE_WEEKLY_DISTRIBUTION}
        isSample
      />
    </div>
  );
}
