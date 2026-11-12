import { z } from 'zod';

import type { Lookup } from '@/features/reference/api';

import type { User, UserInput } from './api';

const PASSWORD_MIN_LENGTH = 8;
/** Digits with optional leading +, spaces, dashes and brackets. */
const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

const baseSchema = z.object({
  firstname: z.string().trim().min(1, 'Enter a first name.').max(100),
  lastname: z.string().trim().min(1, 'Enter a last name.').max(100),
  username: z
    .string()
    .trim()
    .min(1, 'Enter a username.')
    .min(3, 'Use at least 3 characters.')
    .max(50)
    .regex(/^\S+$/, 'A username cannot contain spaces.'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address.')
    .max(254)
    .pipe(z.email('Enter a valid email address, e.g. name@example.org.')),
  phone_number: z
    .string()
    .trim()
    .min(1, 'Enter a phone number.')
    .regex(PHONE_PATTERN, 'Enter a phone number, e.g. +256 700 000000.'),
  location: z.string().trim().min(1, 'Enter a location.').max(150),
  role: z.string().min(1, 'Choose a role.'),
  organization_unit_id: z.string().min(1, 'Choose an organisation unit.'),
});

const newPassword = z
  .string()
  .min(1, 'Enter a password.')
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(200);

/** A new user must be given a password. */
export const createUserSchema = baseSchema.extend({ password: newPassword });

/** On edit, a blank password means "keep the current one". */
export const editUserSchema = baseSchema.extend({
  password: z.union([z.literal(''), newPassword]),
});

export type UserFormValues = z.infer<typeof createUserSchema>;

export const USER_FORM_FIELDS = [
  'firstname',
  'lastname',
  'username',
  'email',
  'phone_number',
  'location',
  'role',
  'organization_unit_id',
  'password',
] as const satisfies readonly (keyof UserFormValues)[];

/**
 * The role id to preselect when editing. The API returns a user's role as an id
 * on some deployments and as a role name on others; either resolves here.
 */
export function resolveRoleId(role: string | null, roles: readonly Lookup[]): string {
  if (!role) return '';
  const match = roles.find(
    (candidate) =>
      String(candidate.id) === role || candidate.name?.toLowerCase() === role.toLowerCase(),
  );
  return match ? String(match.id) : '';
}

/** Initial form values: blank for a new user, the record's values when editing. */
export function userFormDefaults(user: User | null, roles: readonly Lookup[]): UserFormValues {
  return {
    firstname: user?.firstname ?? '',
    lastname: user?.lastname ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    phone_number: user?.phone_number ?? '',
    location: user?.location ?? '',
    role: resolveRoleId(user?.role ?? null, roles),
    organization_unit_id:
      user?.organization_unit_id === null || user?.organization_unit_id === undefined
        ? ''
        : String(user.organization_unit_id),
    // Never prefilled: the form must not echo a credential back to the screen.
    password: '',
  };
}

export function toUserInput(values: UserFormValues): UserInput {
  return values;
}

/** A user's display name, falling back to the username, then the id. */
export function userDisplayName(
  user: Pick<User, 'id' | 'firstname' | 'lastname' | 'username'>,
): string {
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ');
  return fullName || user.username || `User #${user.id}`;
}
