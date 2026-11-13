import OrdersDashboardPage from '@/features/dashboards/OrdersDashboardPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/jms');

export default function Page() {
  return <OrdersDashboardPage />;
}
