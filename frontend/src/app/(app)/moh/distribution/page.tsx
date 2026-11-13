import DistributionPage from '@/features/orders/DistributionPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/moh/distribution');

export default function Page() {
  return <DistributionPage />;
}
