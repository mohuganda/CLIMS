import CondomsPage from '@/features/condoms/CondomsPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/delivery');

export default function Page() {
  return <CondomsPage />;
}
