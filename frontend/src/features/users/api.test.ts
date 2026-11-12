import { describe, expect, it, vi } from 'vitest';

import { createHttpClient } from '@/lib/api';
import { createFakeAdapter } from '@/test/fakeAdapter';

import {
  createUser,
  deleteUser,
  listUsers,
  summariseUsers,
  updateUser,
  type UserInput,
} from './api';

function setup(...script: Parameters<typeof createFakeAdapter>) {
  const { adapter, requests } = createFakeAdapter(...script);
  const http = createHttpClient({
    baseUrl: '/api',
    getToken: () => 'tok',
    onUnauthorized: vi.fn(),
    adapter,
  });
  return { http, requests };
}

const input: UserInput = {
  username: 'nakato',
  firstname: 'Sarah',
  lastname: 'Nakato',
  email: 'sarah@example.org',
  password: 'correct horse',
  role: '2',
  organization_unit_id: '5',
  location: 'Kampala',
  phone_number: '+256700000001',
};

describe('listUsers', () => {
  it('normalises loosely typed fields', async () => {
    const { http } = setup({
      status: 200,
      body: [
        {
          id: '7',
          username: 'okello',
          firstname: '',
          email: null,
          role: 3,
          organization_unit_id: '12',
          status: 'active',
        },
      ],
    });

    await expect(listUsers(http)).resolves.toEqual([
      {
        id: 7,
        username: 'okello',
        firstname: null,
        lastname: null,
        email: null,
        role: '3',
        status: 'active',
        location: null,
        phone_number: null,
        organization_unit_id: 12,
        created_at: null,
      },
    ]);
  });

  it('never keeps a password the API happens to return', async () => {
    const { http } = setup({ status: 200, body: [{ id: 1, username: 'u', password: 'hunter2' }] });
    const [user] = await listUsers(http);
    expect(user).not.toHaveProperty('password');
  });

  it('rejects a response that is not a list', async () => {
    const { http } = setup({ status: 200, body: { message: 'ok' } });
    await expect(listUsers(http)).rejects.toMatchObject({ kind: 'unexpected_response' });
  });
});

describe('createUser', () => {
  it('posts the form values', async () => {
    const { http, requests } = setup({ status: 200, body: { code: '201' } });
    await createUser(http, input);
    expect(requests[0]).toMatchObject({ method: 'POST', url: '/users', body: input });
  });

  it('rejects when the API reports a failure in the envelope', async () => {
    const { http } = setup({
      status: 200,
      body: { code: '409', message: 'Username already taken' },
    });
    await expect(createUser(http, input)).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Username already taken',
    });
  });
});

describe('updateUser', () => {
  it('sends a new password when one was entered', async () => {
    const { http, requests } = setup({ status: 200, body: {} });
    await updateUser(http, 7, input);
    expect(requests[0]).toMatchObject({ method: 'PUT', url: '/users/7' });
    expect(requests[0]?.body).toHaveProperty('password', 'correct horse');
  });

  it('leaves the password out entirely when the field was left blank', async () => {
    const { http, requests } = setup({ status: 200, body: {} });
    await updateUser(http, 7, { ...input, password: '' });
    expect(requests[0]?.body).not.toHaveProperty('password');
    expect(requests[0]?.body).toMatchObject({ username: 'nakato', role: '2' });
  });
});

describe('deleteUser', () => {
  it('deletes by id', async () => {
    const { http, requests } = setup({ status: 200, body: {} });
    await deleteUser(http, 7);
    expect(requests[0]).toMatchObject({ method: 'DELETE', url: '/users/7' });
  });
});

describe('summariseUsers', () => {
  const user = (status: string | null) =>
    ({ status }) as Parameters<typeof summariseUsers>[0][number];

  it('counts active users case-insensitively and everyone else as inactive', () => {
    expect(summariseUsers([user('active'), user('Active'), user('suspended'), user(null)])).toEqual(
      {
        total: 4,
        active: 2,
        inactive: 2,
      },
    );
  });

  it('reports zeros for an empty list', () => {
    expect(summariseUsers([])).toEqual({ total: 0, active: 0, inactive: 0 });
  });
});
