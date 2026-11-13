import InventoryPage from '@/features/inventory/InventoryPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/dcfp/stock');

export default function Page() {
  return <InventoryPage />;
}
