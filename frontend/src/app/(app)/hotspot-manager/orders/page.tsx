import OrdersPage from '@/features/orders/OrdersPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/hotspot-manager/orders');

export default function Page() {
  return <OrdersPage />;
}
