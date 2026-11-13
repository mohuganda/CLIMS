import OrdersPage from '@/features/orders/OrdersPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/delivery/orders');

export default function Page() {
  return <OrdersPage />;
}
