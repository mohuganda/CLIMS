import { Boxes, PackageCheck, Percent } from 'lucide-react';

import { PendingTable } from '@/components/data-table/PendingTable';
import { PageHeader } from '@/components/PageHeader';
import { SampleDataNotice } from '@/components/SampleData';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { SAMPLE_DISTRIBUTION_SUMMARY } from '@/features/dashboards/sampleData';
import { formatNumber } from '@/lib/format';

/** Where condoms have gone, by hotspot. The list has no endpoint yet. */
export default function DistributionPage() {
  return (
    <>
      <PageHeader description="Condoms distributed to hotspots, by type, location and distributor." />
      <SampleDataNotice subject="The distribution figures" />
      <StatCardGrid>
        <StatCard
          label="Total condoms"
          value={formatNumber(SAMPLE_DISTRIBUTION_SUMMARY.total)}
          icon={Boxes}
          isSample
        />
        <StatCard
          label="Condoms distributed"
          value={formatNumber(SAMPLE_DISTRIBUTION_SUMMARY.distributed)}
          icon={PackageCheck}
          isSample
        />
        <StatCard
          label="Success rate"
          value={SAMPLE_DISTRIBUTION_SUMMARY.successRate}
          icon={Percent}
          isSample
        />
      </StatCardGrid>
      <PendingTable
        label="Distributions"
        columns={['Hotspot', 'Condom type', 'Amount', 'Location', 'Distributor']}
        emptyTitle="No distributions recorded yet"
        emptyDescription="Distributions will be listed here once this screen is connected to the server."
      />
    </>
  );
}
