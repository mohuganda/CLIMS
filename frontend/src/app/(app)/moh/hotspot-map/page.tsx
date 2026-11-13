import HotspotMapPage from '@/features/hotspots/HotspotMapPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/moh/hotspot-map');

export default function Page() {
  return <HotspotMapPage />;
}
