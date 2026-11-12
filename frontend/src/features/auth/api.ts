import type { HttpClient } from '@/lib/api';
import { parseBody } from '@/lib/api';

import { sessionSchema, type Session } from './session';

export interface Credentials {
  username: string;
  password: string;
}

/** Exchanges credentials for a session. Wrong credentials reject with an `unauthorized` ApiError. */
export async function signIn(http: HttpClient, credentials: Credentials): Promise<Session> {
  const body = await http.post('/login', credentials, { anonymous: true });
  return parseBody(sessionSchema, body, 'login');
}

/** Revokes the current token on the server. */
export async function signOut(http: HttpClient): Promise<void> {
  await http.post('/logout');
}
