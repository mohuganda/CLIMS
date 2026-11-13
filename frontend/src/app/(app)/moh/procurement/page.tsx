import ProcurementPage from '@/features/procurement/ProcurementPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/moh/procurement');

export default function Page() {
  return <ProcurementPage />;
}
