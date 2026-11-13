import HotspotsPage from '@/features/hotspots/HotspotsPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/dcfp/hotspots');

export default function Page() {
  return <HotspotsPage />;
}
