import CondomsPage from '@/features/condoms/CondomsPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/nms/condoms');

export default function Page() {
  return <CondomsPage />;
}
