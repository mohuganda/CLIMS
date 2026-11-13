/**
 * Illustrative figures for dashboards whose data source does not exist yet.
 *
 * Everything in this file is made up, carried over from the prototype these
 * screens were designed with. Every component that renders a value from here
 * marks it as sample data on screen. When an endpoint for a figure exists,
 * delete its entry here and read it through a query instead; do not edit these
 * numbers to look more plausible.
 */
import type { ChartRow } from '@/components/charts/ChartCard';

export const SAMPLE_STOCK_SUMMARY = { received: 3213, distributed: 200, atHand: 3000 } as const;

export const SAMPLE_ORDER_SUMMARY = { received: 10, workedOn: 8, successRate: '70%' } as const;

export const SAMPLE_DISTRIBUTION_SUMMARY = {
  total: 10,
  distributed: 8,
  successRate: '70%',
} as const;

export const USAGE_LEVELS = ['national', 'district', 'facility', 'community'] as const;
export type UsageLevel = (typeof USAGE_LEVELS)[number];

export const SAMPLE_USAGE_BY_LEVEL: Record<
  UsageLevel,
  { label: string; atHand: number; used: number }
> = {
  national: { label: 'National', atHand: 20000, used: 15000 },
  district: { label: 'District', atHand: 4, used: 20 },
  facility: { label: 'Facility', atHand: 4, used: 20 },
  community: { label: 'Community', atHand: 2, used: 10 },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RECEIVED = [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 30, 45];
const DISPATCHED = [30, 25, 36, 30, 45, 35, 64, 52, 59, 36, 39, 51];

export const SAMPLE_MONTHLY_MOVEMENT: ChartRow[] = MONTHS.map((label, index) => ({
  label,
  values: { received: RECEIVED[index] ?? 0, dispatched: DISPATCHED[index] ?? 0 },
}));

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DISTRIBUTED_THIS_WEEK = [44, 55, 41, 67, 22, 43, 65];

export const SAMPLE_WEEKLY_DISTRIBUTION: ChartRow[] = WEEKDAYS.map((label, index) => ({
  label,
  values: { distributed: DISTRIBUTED_THIS_WEEK[index] ?? 0 },
}));

export const SAMPLE_GENDER_SPLIT = { male: 65, female: 35 } as const;
