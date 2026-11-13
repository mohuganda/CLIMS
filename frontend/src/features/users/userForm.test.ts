import { describe, expect, it } from 'vitest';

import type { User } from './api';
import {
  createUserSchema,
  editUserSchema,
  resolveRoleId,
  userDisplayName,
  userFormDefaults,
  type UserFormValues,
} from './userForm';

const valid: UserFormValues = {
  firstname: 'Sarah',
  lastname: 'Nakato',
  username: 'snakato',
  email: 'sarah@example.org',
  phone_number: '+256 700 000001',
  location: 'Kampala',
  role: '2',
  organization_unit_id: '5',
  password: 'correct horse',
};

const roles = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'DCFP' },
];

const user: User = {
  id: 7,
  username: 'okello',
  firstname: 'James',
  lastname: 'Okello',
  email: 'james@example.org',
  role: 'dcfp',
  status: 'active',
  location: 'Gulu',
  phone_number: '0772000000',
  organization_unit_id: 12,
  created_at: null,
};

const firstIssue = (schema: typeof createUserSchema, values: unknown) =>
  schema.safeParse(values).error?.issues[0]?.path[0];

describe('createUserSchema', () => {
  it('accepts a complete form', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it('trims surrounding whitespace from text fields', () => {
    const parsed = createUserSchema.parse({
      ...valid,
      firstname: '  Sarah ',
      username: ' snakato ',
    });
    expect(parsed).toMatchObject({ firstname: 'Sarah', username: 'snakato' });
  });

  it.each([
    { field: 'firstname', value: '   ' },
    { field: 'lastname', value: '' },
    { field: 'username', value: 'ab' },
    { field: 'username', value: 'sarah nakato' },
    { field: 'email', value: 'sarah@' },
    { field: 'email', value: 'not an email' },
    { field: 'phone_number', value: '12345' },
    { field: 'phone_number', value: 'call me' },
    { field: 'phone_number', value: '+256700000001; DROP TABLE users' },
    { field: 'location', value: '' },
    { field: 'role', value: '' },
    { field: 'organization_unit_id', value: '' },
    { field: 'password', value: '' },
    { field: 'password', value: 'short' },
  ])('rejects $field = "$value"', ({ field, value }) => {
    expect(firstIssue(createUserSchema, { ...valid, [field]: value })).toBe(field);
  });

  it.each(['0772000000', '+256700000001', '(041) 123-4567'])(
    'accepts the phone number %s',
    (phone) => {
      expect(createUserSchema.safeParse({ ...valid, phone_number: phone }).success).toBe(true);
    },
  );

  it('does not trim the password', () => {
    expect(createUserSchema.parse({ ...valid, password: ' spaced out ' }).password).toBe(
      ' spaced out ',
    );
  });
});

describe('editUserSchema', () => {
  it('accepts a blank password, meaning "unchanged"', () => {
    expect(editUserSchema.safeParse({ ...valid, password: '' }).success).toBe(true);
  });

  it('still enforces the minimum length when a new password is entered', () => {
    expect(editUserSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });
});

describe('resolveRoleId', () => {
  it.each([
    { name: 'a role id', role: '2', expected: '2' },
    { name: 'a role name', role: 'DCFP', expected: '2' },
    { name: 'a role name in another case', role: 'dcfp', expected: '2' },
    { name: 'an unknown role', role: 'auditor', expected: '' },
    { name: 'no role', role: null, expected: '' },
  ])('resolves $name', ({ role, expected }) => {
    expect(resolveRoleId(role, roles)).toBe(expected);
  });

  it('resolves nothing while the role list is still empty', () => {
    expect(resolveRoleId('2', [])).toBe('');
  });
});

describe('userFormDefaults', () => {
  it('is blank for a new user', () => {
    expect(Object.values(userFormDefaults(null, roles)).every((value) => value === '')).toBe(true);
  });

  it('fills the form from the record being edited', () => {
    expect(userFormDefaults(user, roles)).toMatchObject({
      firstname: 'James',
      username: 'okello',
      role: '2',
      organization_unit_id: '12',
    });
  });

  it('never prefills the password, even if the record carried one', () => {
    const leaky = { ...user, password: 'hunter2' } as User;
    expect(userFormDefaults(leaky, roles).password).toBe('');
  });
});

describe('userDisplayName', () => {
  it.each([
    {
      name: 'both names',
      user: { id: 1, firstname: 'A', lastname: 'B', username: 'ab' },
      expected: 'A B',
    },
    {
      name: 'one name',
      user: { id: 1, firstname: null, lastname: 'B', username: 'ab' },
      expected: 'B',
    },
    {
      name: 'only a username',
      user: { id: 1, firstname: null, lastname: null, username: 'ab' },
      expected: 'ab',
    },
    {
      name: 'nothing but an id',
      user: { id: 9, firstname: null, lastname: null, username: null },
      expected: 'User #9',
    },
  ])('uses $name', ({ user: subject, expected }) => {
    expect(userDisplayName(subject)).toBe(expected);
  });
});
