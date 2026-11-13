'use client';

import { SampleDataNotice } from '@/components/SampleData';
import { OrderSummaryCards } from '@/features/orders/OrderSummaryCards';

/** Order throughput for a supplier or warehouse. */
export default function OrdersDashboardPage() {
  return (
    <>
      <SampleDataNotice subject="The order figures" />
      <OrderSummaryCards />
    </>
  );
}
