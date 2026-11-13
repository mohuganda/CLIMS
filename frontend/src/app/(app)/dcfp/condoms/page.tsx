import CondomsPage from '@/features/condoms/CondomsPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/dcfp/condoms');

export default function Page() {
  return <CondomsPage />;
}
