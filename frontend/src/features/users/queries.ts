import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiQuery, useHttp } from '@/lib/api';

import { createUser, deleteUser, listUsers, updateUser, type User, type UserInput } from './api';

const usersKey = ['users'] as const;

export function useUsers() {
  return useApiQuery(usersKey, listUsers);
}

/** Creates a user, or updates `user` when one is given. */
export function useSaveUser(user: User | null) {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) =>
      user ? updateUser(http, user.id, input) : createUser(http, input),
    onSuccess: async () => {
      toast.success(user ? 'User updated' : 'User created');
      await queryClient.invalidateQueries({ queryKey: usersKey });
    },
    // The form places field-level messages itself; see UserFormDialog.
    meta: { handlesOwnErrors: true },
  });
}

export function useDeleteUser() {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUser(http, id),
    onSuccess: async () => {
      toast.success('User deleted');
      await queryClient.invalidateQueries({ queryKey: usersKey });
    },
    // The confirmation dialog shows the failure itself.
    meta: { handlesOwnErrors: true },
  });
}
