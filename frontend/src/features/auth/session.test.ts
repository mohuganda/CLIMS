import { describe, expect, it } from 'vitest';

import { createMemoryStorage } from '@/lib/storage/jsonStorage';

import { createSessionStore, sessionSchema, type Session } from './session';

const session: Session = {
  token: 'tok_1',
  user: {
    id: 4,
    username: 'nakato',
    role: 'admin',
    firstname: 'Nakato',
    lastname: null,
    email: null,
  },
};

describe('sessionSchema', () => {
  it('normalises a numeric role id and a string id', () => {
    const parsed = sessionSchema.parse({ token: 't', user: { id: '12', username: 'u', role: 3 } });
    expect(parsed.user).toMatchObject({ id: 12, role: '3', firstname: null, email: null });
  });

  it('accepts a user with no role', () => {
    expect(
      sessionSchema.parse({ token: 't', user: { id: 1, username: 'u' } }).user.role,
    ).toBeNull();
  });

  it.each([
    { name: 'a missing token', value: { user: { id: 1, username: 'u' } } },
    { name: 'an empty token', value: { token: '', user: { id: 1, username: 'u' } } },
    { name: 'a missing user', value: { token: 't' } },
    { name: 'a user without an id', value: { token: 't', user: { username: 'u' } } },
    { name: 'a non-numeric id', value: { token: 't', user: { id: 'abc', username: 'u' } } },
    { name: 'an empty username', value: { token: 't', user: { id: 1, username: '' } } },
  ])('rejects $name', ({ value }) => {
    expect(sessionSchema.safeParse(value).success).toBe(false);
  });
});

describe('createSessionStore', () => {
  it('loads what it saved', () => {
    const store = createSessionStore(createMemoryStorage());
    store.save(session);
    expect(store.load()).toEqual(session);
  });

  it('loads null after clear', () => {
    const store = createSessionStore(createMemoryStorage());
    store.save(session);
    store.clear();
    expect(store.load()).toBeNull();
  });

  it.each([
    { name: 'corrupted JSON', raw: '{"token":' },
    { name: 'a session with no token', raw: JSON.stringify({ user: session.user }) },
    { name: 'the legacy shape with an empty object', raw: '{}' },
    { name: 'a tampered user', raw: JSON.stringify({ token: 't', user: 'admin' }) },
  ])('treats $name as signed out instead of crashing', ({ raw }) => {
    const store = createSessionStore(createMemoryStorage({ 'clims.session': raw }));
    expect(store.load()).toBeNull();
  });
});
