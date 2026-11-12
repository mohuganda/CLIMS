import { PendingTable } from '@/components/data-table/PendingTable';
import { PageHeader } from '@/components/PageHeader';
import { SampleDataNotice } from '@/components/SampleData';

import { OrderSummaryCards } from './OrderSummaryCards';

/** Orders placed by hotspots. The list has no endpoint yet, so it shows as empty. */
export default function OrdersPage() {
  return (
    <>
      <PageHeader description="Requests for condoms from hotspots, and how many have been fulfilled." />
      <SampleDataNotice subject="The order figures" />
      <OrderSummaryCards />
      <PendingTable
        label="Orders"
        columns={[
          'Order ID',
          'Hotspot requesting',
          'Contact person',
          'Location',
          'Amount requested',
        ]}
        emptyTitle="No orders yet"
        emptyDescription="Orders will be listed here once ordering is connected to the server."
      />
    </>
  );
}
