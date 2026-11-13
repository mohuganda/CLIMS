import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiQuery, useHttp } from '@/lib/api';

import {
  createHotspot,
  deleteHotspot,
  listHotspots,
  updateHotspot,
  type Hotspot,
  type HotspotInput,
} from './api';

const hotspotsKey = ['hotspots'] as const;

export function useHotspots() {
  return useApiQuery(hotspotsKey, listHotspots);
}

/** Creates a hotspot, or updates `hotspot` when one is given. */
export function useSaveHotspot(hotspot: Hotspot | null) {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HotspotInput) =>
      hotspot ? updateHotspot(http, hotspot.id, input) : createHotspot(http, input),
    onSuccess: async () => {
      toast.success(hotspot ? 'Hotspot updated' : 'Hotspot added');
      await queryClient.invalidateQueries({ queryKey: hotspotsKey });
    },
    meta: { handlesOwnErrors: true },
  });
}

export function useDeleteHotspot() {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteHotspot(http, id),
    onSuccess: async () => {
      toast.success('Hotspot deleted');
      await queryClient.invalidateQueries({ queryKey: hotspotsKey });
    },
    // The confirmation dialog shows the failure itself.
    meta: { handlesOwnErrors: true },
  });
}
