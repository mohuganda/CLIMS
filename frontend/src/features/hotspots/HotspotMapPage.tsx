import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { MapPinOff } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppConfig } from '@/config/ConfigProvider';
import { formatText } from '@/lib/format';

import { mappableHotspots, type MappableHotspot } from './api';
import { mapSummary } from './mapSummary';
import { hotspotLabel } from './hotspotForm';
import { useHotspots } from './queries';

/** Roughly the centre of Uganda, at a zoom that shows the whole country. */
const DEFAULT_CENTER = { lat: 1.3733, lng: 32.2903 };
const DEFAULT_ZOOM = 7;
const MAP_CLASS = 'h-[min(650px,70vh)] w-full';

interface HotspotMapProps {
  apiKey: string;
  hotspots: readonly MappableHotspot[];
}

function HotspotMap({ apiKey, hotspots }: HotspotMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'clims-google-maps',
    googleMapsApiKey: apiKey,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = hotspots.find((hotspot) => hotspot.id === selectedId);

  if (loadError) {
    return <ErrorState title="Could not load the map" error={loadError} />;
  }
  if (!isLoaded) {
    return <Skeleton className={`${MAP_CLASS} rounded-none`} />;
  }

  return (
    <GoogleMap
      mapContainerClassName={MAP_CLASS}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
      onClick={() => {
        setSelectedId(null);
      }}
    >
      {hotspots.map((hotspot) => (
        <MarkerF
          key={hotspot.id}
          position={{ lat: hotspot.latitude, lng: hotspot.longitude }}
          title={hotspotLabel(hotspot)}
          onClick={() => {
            setSelectedId(hotspot.id);
          }}
        />
      ))}
      {selected ? (
        <InfoWindowF
          position={{ lat: selected.latitude, lng: selected.longitude }}
          onCloseClick={() => {
            setSelectedId(null);
          }}
        >
          {/* The info window is Google's own white surface in both themes, so
              its text uses fixed dark colours rather than theme tokens. */}
          <div className="flex max-w-56 flex-col gap-1 text-sm text-neutral-900">
            <p className="font-semibold break-words">{hotspotLabel(selected)}</p>
            <p className="break-words text-neutral-600">
              {formatText(selected.contact_person_name)} ·{' '}
              {formatText(selected.contact_person_telephone)}
            </p>
            <div>
              <StatusBadge status={selected.hotspot_status} />
            </div>
          </div>
        </InfoWindowF>
      ) : null}
    </GoogleMap>
  );
}

export default function HotspotMapPage() {
  const { googleMapsApiKey } = useAppConfig();
  const hotspots = useHotspots();
  const onMap = hotspots.data ? mappableHotspots(hotspots.data) : [];

  return (
    <>
      <PageHeader description="Where hotspots are. Select a marker to see its contact person and status." />

      <div className="bg-card overflow-hidden rounded-xl border">
        {googleMapsApiKey === null ? (
          <EmptyState
            icon={MapPinOff}
            title="The map is not set up"
            description="No Google Maps key is configured for this deployment. Ask whoever deploys CLIMS to set VITE_GOOGLE_MAPS_API_KEY."
          />
        ) : hotspots.isError && !hotspots.data ? (
          <ErrorState
            title="Could not load hotspots"
            error={hotspots.error}
            onRetry={() => void hotspots.refetch()}
            isRetrying={hotspots.isRefetching}
          />
        ) : hotspots.isPending ? (
          <Skeleton className={`${MAP_CLASS} rounded-none`} />
        ) : (
          <HotspotMap apiKey={googleMapsApiKey} hotspots={onMap} />
        )}
      </div>

      {hotspots.data && googleMapsApiKey !== null ? (
        <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
          {mapSummary(onMap.length, hotspots.data.length)}
        </p>
      ) : null}
    </>
  );
}
