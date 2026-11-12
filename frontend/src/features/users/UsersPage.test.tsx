import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

import UsersPage from './UsersPage';

const roles = [{ id: 2, name: 'DCFP' }];
const units = [{ id: 5, name: 'Gulu District Health Office' }];
const users = [
  // id 1 is the signed-in test user.
  { id: 1, username: 'snakato', firstname: 'Sarah', lastname: 'Nakato', status: 'active', role: 2 },
  {
    id: 7,
    username: 'okello',
    firstname: 'James',
    lastname: 'Okello',
    status: 'inactive',
    role: 2,
  },
];

/** Replies for the three reads the page makes on mount, in request order. */
const pageLoad = [
  { status: 200, body: users },
  { status: 200, body: roles },
  { status: 200, body: units },
];

async function fillUserForm(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog');
  await user.type(within(dialog).getByLabelText('First name'), 'Grace');
  await user.type(within(dialog).getByLabelText('Last name'), 'Atim');
  await user.type(within(dialog).getByLabelText('Username'), 'gatim');
  await user.type(within(dialog).getByLabelText('Email'), 'grace@example.org');
  await user.type(within(dialog).getByLabelText('Phone number'), '+256700000003');
  await user.type(within(dialog).getByLabelText('Location'), 'Gulu');
  await user.click(within(dialog).getByRole('combobox', { name: 'Role' }));
  await user.click(await screen.findByRole('option', { name: 'DCFP' }));
  await user.click(within(dialog).getByRole('combobox', { name: 'Organisation unit' }));
  await user.click(await screen.findByRole('option', { name: 'Gulu District Health Office' }));
  await user.type(within(dialog).getByLabelText('Password'), 'a-test-password');
  return dialog;
}

describe('UsersPage', () => {
  it('lists users with their role shown by name', async () => {
    renderApp(<UsersPage />, { signedIn: true, replies: pageLoad });

    const row = (await screen.findByText('James Okello')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('DCFP')).toBeInTheDocument();
    expect(within(row!).getByText('inactive')).toBeInTheDocument();
  });

  it('does not offer to delete the account you are signed in with', async () => {
    const user = userEvent.setup();
    renderApp(<UsersPage />, { signedIn: true, replies: pageLoad });
    await screen.findByText('Sarah Nakato');

    await user.click(screen.getByRole('button', { name: 'Actions for Sarah Nakato' }));
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('creates a user and closes the dialog', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<UsersPage />, {
      signedIn: true,
      replies: [...pageLoad, { status: 200, body: { code: '201' } }, { status: 200, body: users }],
    });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = await fillUserForm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(requests.find((request) => request.method === 'POST')).toMatchObject({
      url: '/users',
      body: {
        username: 'gatim',
        role: '2',
        organization_unit_id: '5',
        password: 'a-test-password',
      },
    });
  });

  it('shows a server validation message beside the field it is about and keeps the form open', async () => {
    const user = userEvent.setup();
    renderApp(<UsersPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        {
          status: 422,
          body: {
            message: 'The given data was invalid.',
            errors: { username: ['That username is already taken.'] },
          },
        },
      ],
    });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = await fillUserForm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    expect(await within(dialog).findByText('That username is already taken.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('First name')).toHaveValue('Grace');
  });

  it('reports a failure that belongs to no field inside the dialog, and keeps what was typed', async () => {
    const user = userEvent.setup();
    const { onMutationError } = renderApp(<UsersPage />, {
      signedIn: true,
      replies: [...pageLoad, { failure: 'network' }],
    });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = await fillUserForm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Check your connection and try again.',
    );
    expect(within(dialog).getByLabelText('Username')).toHaveValue('gatim');
    // Shown in place, so the global toast must not announce it a second time.
    expect(onMutationError).not.toHaveBeenCalled();
  });

  it('never shows an existing password when editing', async () => {
    const user = userEvent.setup();
    renderApp(<UsersPage />, {
      signedIn: true,
      replies: [
        { status: 200, body: [{ ...users[1], password: 'hunter2' }] },
        ...pageLoad.slice(1),
      ],
    });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Actions for James Okello' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    const password = within(dialog).getByLabelText(/New password/);
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('type', 'password');
    expect(document.body.innerHTML).not.toContain('hunter2');
  });

  it('deletes only after confirmation', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<UsersPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 200, body: { code: '201' } },
        { status: 200, body: [users[0]] },
      ],
    });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Actions for James Okello' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Delete James Okello?');
    expect(requests.some((request) => request.method === 'DELETE')).toBe(false);

    await user.click(within(confirm).getByRole('button', { name: 'Delete user' }));

    await waitFor(() => {
      expect(requests.find((request) => request.method === 'DELETE')).toMatchObject({
        url: '/users/7',
      });
    });
  });

  it('keeps the confirmation open and explains when a delete fails', async () => {
    const user = userEvent.setup();
    renderApp(<UsersPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 200, body: { code: '409', message: 'This user still has stock recorded.' } },
      ],
    });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Actions for James Okello' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Delete user' }));

    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'This user still has stock recorded.',
    );
    expect(screen.getByText('James Okello')).toBeInTheDocument();
  });

  it('leaves the user alone when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<UsersPage />, { signedIn: true, replies: pageLoad });
    await screen.findByText('James Okello');

    await user.click(screen.getByRole('button', { name: 'Actions for James Okello' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(requests.some((request) => request.method === 'DELETE')).toBe(false);
  });
});
