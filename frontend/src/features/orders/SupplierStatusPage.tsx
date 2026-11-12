import { PendingTable } from '@/components/data-table/PendingTable';
import { PageHeader } from '@/components/PageHeader';
import { SampleDataNotice } from '@/components/SampleData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { OrderSummaryCards } from './OrderSummaryCards';

/** A supplier's view of what it has submitted and where each submission stands. */
export default function SupplierStatusPage() {
  return (
    <>
      <PageHeader description="The status of condom supplies submitted to the Ministry of Health." />
      <SampleDataNotice subject="The order figures" />
      <OrderSummaryCards />
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All submissions</TabsTrigger>
          <TabsTrigger value="mine">My submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <PendingTable
            label="All submissions"
            columns={['Hotspot', 'Company brand', 'Condom type', 'Amount', 'Status']}
            emptyTitle="No submissions yet"
            emptyDescription="Submissions will be listed here once this screen is connected to the server."
          />
        </TabsContent>
        <TabsContent value="mine" className="mt-4">
          <PendingTable
            label="My submissions"
            columns={['Company brand', 'Condom type', 'Amount']}
            emptyTitle="You have not submitted anything yet"
            emptyDescription="Your submissions will be listed here once this screen is connected to the server."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
