import { ClipboardCheck, ClipboardList, Percent } from 'lucide-react';

import { StatCard, StatCardGrid } from '@/components/StatCard';
import { SAMPLE_ORDER_SUMMARY } from '@/features/dashboards/sampleData';
import { formatNumber } from '@/lib/format';

/** Headline order figures. Sample data until an orders endpoint exists. */
export function OrderSummaryCards() {
  return (
    <StatCardGrid>
      <StatCard
        label="Orders received"
        value={formatNumber(SAMPLE_ORDER_SUMMARY.received)}
        icon={ClipboardList}
        isSample
      />
      <StatCard
        label="Orders worked on"
        value={formatNumber(SAMPLE_ORDER_SUMMARY.workedOn)}
        icon={ClipboardCheck}
        isSample
      />
      <StatCard
        label="Success rate"
        value={SAMPLE_ORDER_SUMMARY.successRate}
        icon={Percent}
        isSample
      />
    </StatCardGrid>
  );
}
