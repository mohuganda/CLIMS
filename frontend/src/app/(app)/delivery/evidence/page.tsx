import EvidencePage from '@/features/evidence/EvidencePage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/delivery/evidence');

export default function Page() {
  return <EvidencePage />;
}
