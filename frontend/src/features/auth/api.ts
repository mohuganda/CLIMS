import type { HttpClient } from '@/lib/api';
import { parseBody } from '@/lib/api';

import { sessionSchema, type Session } from './session';

export interface Credentials {
  email: string;
  password: string;
}

/** Exchanges credentials for a session. Wrong credentials reject with an `unauthorized` ApiError. */
export async function signIn(http: HttpClient, credentials: Credentials): Promise<Session> {
  const body = await http.post('/auth/login', credentials, { anonymous: true });
  return parseBody(sessionSchema, body, 'login');
}
