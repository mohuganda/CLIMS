import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiQuery, useHttp } from '@/lib/api';

import {
  createCondom,
  deleteCondom,
  listCondoms,
  updateCondom,
  type Condom,
  type CondomInput,
} from './api';

const condomsKey = ['condoms'] as const;

export function useCondoms() {
  return useApiQuery(condomsKey, listCondoms);
}

/** Creates a condom item, or updates `condom` when one is given. */
export function useSaveCondom(condom: Condom | null) {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CondomInput) =>
      condom ? updateCondom(http, condom.id, input) : createCondom(http, input),
    onSuccess: async () => {
      toast.success(condom ? 'Condom item updated' : 'Condom item added');
      await queryClient.invalidateQueries({ queryKey: condomsKey });
    },
    meta: { handlesOwnErrors: true },
  });
}

export function useDeleteCondom() {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCondom(http, id),
    onSuccess: async () => {
      toast.success('Condom item deleted');
      await queryClient.invalidateQueries({ queryKey: condomsKey });
    },
    // The confirmation dialog shows the failure itself.
    meta: { handlesOwnErrors: true },
  });
}
