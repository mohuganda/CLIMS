import EvidencePage from '@/features/evidence/EvidencePage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/hotspot-manager/evidence');

export default function Page() {
  return <EvidencePage />;
}
