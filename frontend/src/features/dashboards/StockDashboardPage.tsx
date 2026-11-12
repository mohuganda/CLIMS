import { Boxes, PackageCheck, PackagePlus } from 'lucide-react';

import { SampleDataNotice } from '@/components/SampleData';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { formatNumber } from '@/lib/format';

import { SAMPLE_STOCK_SUMMARY } from './sampleData';
import { UsageCharts } from './UsageCharts';

/** Stock position for a site that receives and distributes condoms. */
export default function StockDashboardPage() {
  return (
    <>
      <SampleDataNotice subject="The stock figures and charts" />
      <StatCardGrid>
        <StatCard
          label="Condoms received"
          value={formatNumber(SAMPLE_STOCK_SUMMARY.received)}
          icon={PackagePlus}
          isSample
        />
        <StatCard
          label="Condoms distributed"
          value={formatNumber(SAMPLE_STOCK_SUMMARY.distributed)}
          icon={PackageCheck}
          isSample
        />
        <StatCard
          label="Condoms at hand"
          value={formatNumber(SAMPLE_STOCK_SUMMARY.atHand)}
          icon={Boxes}
          isSample
        />
      </StatCardGrid>
      <UsageCharts />
    </>
  );
}
