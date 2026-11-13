import SupplierStatusPage from '@/features/orders/SupplierStatusPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/suppliers/status');

export default function Page() {
  return <SupplierStatusPage />;
}
