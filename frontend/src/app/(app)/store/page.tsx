import StockDashboardPage from '@/features/dashboards/StockDashboardPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/store');

export default function Page() {
  return <StockDashboardPage />;
}
