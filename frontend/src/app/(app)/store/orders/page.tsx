import OrdersPage from '@/features/orders/OrdersPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/store/orders');

export default function Page() {
  return <OrdersPage />;
}
