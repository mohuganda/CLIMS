import { z } from 'zod';

import { idSchema, optionalNumber, optionalText, parseList, type HttpClient } from '@/lib/api';

const userSchema = z.object({
  id: idSchema,
  username: optionalText,
  firstname: optionalText,
  lastname: optionalText,
  email: optionalText,
  role: optionalText,
  status: optionalText,
  location: optionalText,
  phone_number: optionalText,
  organization_unit_id: optionalNumber,
  created_at: optionalText,
});

export type User = z.infer<typeof userSchema>;

/** What the create and edit forms submit. */
export interface UserInput {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  /** Blank on edit means "leave the password unchanged". */
  password: string;
  role: string;
  organization_unit_id: string;
  location: string;
  phone_number: string;
}

export async function listUsers(http: HttpClient, signal?: AbortSignal): Promise<User[]> {
  return parseList(userSchema, await http.get('/users', { signal }), 'users');
}

export async function createUser(http: HttpClient, input: UserInput): Promise<void> {
  await http.post('/users', input);
}

export async function updateUser(http: HttpClient, id: number, input: UserInput): Promise<void> {
  const { password, ...rest } = input;
  // Sending an empty password would either fail validation or blank it.
  await http.put(`/users/${id}`, password ? { ...rest, password } : rest);
}

export async function deleteUser(http: HttpClient, id: number): Promise<void> {
  await http.delete(`/users/${id}`);
}

/** Counts by status for the dashboard. Anything not marked active counts as inactive. */
export function summariseUsers(users: readonly User[]): {
  total: number;
  active: number;
  inactive: number;
} {
  const active = users.filter((user) => user.status?.toLowerCase() === 'active').length;
  return { total: users.length, active, inactive: users.length - active };
}
