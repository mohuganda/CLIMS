import OrdersPage from '@/features/orders/OrdersPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/dcfp/orders');

export default function Page() {
  return <OrdersPage />;
}
