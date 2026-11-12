import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiQuery, useHttp } from '@/lib/api';

import {
  adjustInventory,
  createInventory,
  deleteInventory,
  listInventory,
  type InventoryInput,
  type StockAdjustment,
} from './api';

const inventoryKey = ['inventory'] as const;

export function useInventory() {
  return useApiQuery(inventoryKey, listInventory);
}

/** Records a delivery, attributed to the signed-in user. */
export function useCreateInventory(userId: number) {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InventoryInput) => createInventory(http, input, userId),
    onSuccess: async () => {
      toast.success('Stock recorded');
      await queryClient.invalidateQueries({ queryKey: inventoryKey });
    },
    meta: { handlesOwnErrors: true },
  });
}

export function useAdjustInventory(id: number) {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (adjustment: StockAdjustment) => adjustInventory(http, id, adjustment),
    onSuccess: async () => {
      toast.success('Stock updated');
      await queryClient.invalidateQueries({ queryKey: inventoryKey });
    },
    meta: { handlesOwnErrors: true },
  });
}

export function useDeleteInventory() {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteInventory(http, id),
    onSuccess: async () => {
      toast.success('Stock record deleted');
      await queryClient.invalidateQueries({ queryKey: inventoryKey });
    },
    // The confirmation dialog shows the failure itself.
    meta: { handlesOwnErrors: true },
  });
}
