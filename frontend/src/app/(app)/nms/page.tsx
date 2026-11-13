import OrdersDashboardPage from '@/features/dashboards/OrdersDashboardPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/nms');

export default function Page() {
  return <OrdersDashboardPage />;
}
