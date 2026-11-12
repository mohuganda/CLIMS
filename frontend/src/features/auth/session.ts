import { z } from 'zod';

import { readJson, removeKey, writeJson, type StorageLike } from '@/lib/storage/jsonStorage';

/**
 * The signed-in user as this app needs it. Fields beyond `id` are optional in
 * practice on the legacy API, so they are nullable rather than assumed.
 */
export const authUserSchema = z.object({
  id: z.coerce.number().int(),
  username: z.string().min(1),
  // The API sends a role name on some deployments and a role id on others.
  role: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((role) => (role === null || role === undefined ? null : String(role))),
  firstname: z.string().nullish().default(null),
  lastname: z.string().nullish().default(null),
  email: z.string().nullish().default(null),
});

export const sessionSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type Session = z.infer<typeof sessionSchema>;

const SESSION_KEY = 'clims.session';

/** Persists the session so a page reload does not sign the user out. */
export interface SessionStore {
  load(): Session | null;
  save(session: Session): void;
  clear(): void;
  /** The storage key, for matching cross-tab `storage` events. */
  readonly key: string;
}

export function createSessionStore(storage: StorageLike): SessionStore {
  return {
    key: SESSION_KEY,
    load: () =>
      readJson(storage, SESSION_KEY, (value) => {
        const result = sessionSchema.safeParse(value);
        return result.success ? result.data : null;
      }),
    save: (session) => {
      writeJson(storage, SESSION_KEY, session);
    },
    clear: () => {
      removeKey(storage, SESSION_KEY);
    },
  };
}
