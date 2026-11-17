import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useHttp } from '@/lib/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

import { signIn, type Credentials } from './api';
import { selectCurrentUser, selectSession, sessionEnded, sessionStarted } from './authSlice';

/** The current session, or `null` when signed out. */
export function useSession() {
  return useAppSelector(selectSession);
}

/** The signed-in user, or `null` when signed out. */
export function useCurrentUser() {
  return useAppSelector(selectCurrentUser);
}

/** Signs in. The sign-in form renders the failure itself, next to the fields. */
export function useSignIn() {
  const http = useHttp();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (credentials: Credentials) => signIn(http, credentials),
    onSuccess: (session) => {
      dispatch(sessionStarted(session));
    },
    meta: { handlesOwnErrors: true },
  });
}

/**
 * Returns a function that signs out.
 *
 * The API issues stateless JWTs with no revocation endpoint, so signing out
 * means forgetting the token here. It ends immediately and unconditionally.
 */
export function useSignOut() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useCallback(() => {
    dispatch(sessionEnded());
    // Cached responses belong to the user who fetched them.
    queryClient.clear();
  }, [dispatch, queryClient]);
}
