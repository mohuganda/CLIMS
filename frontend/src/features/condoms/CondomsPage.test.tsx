import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

import CondomsPage from './CondomsPage';

const condoms = [
  { id: 1, category: 'Male', brand: 'Protector', type: 'Latex', unit_of_measure_id: 2 },
];
const units = [{ id: 2, name: 'Box of 144' }];
const pageLoad = [
  { status: 200, body: condoms },
  { status: 200, body: units },
];

describe('CondomsPage', () => {
  it('lists items with the unit of measure shown by name', async () => {
    renderApp(<CondomsPage />, { signedIn: true, replies: pageLoad });

    const row = (await screen.findByText('Protector')).closest('tr');
    expect(within(row!).getByText('Box of 144')).toBeInTheDocument();
  });

  it('adds an item, then reloads the list', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<CondomsPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 200, body: { code: '201' } },
        { status: 200, body: condoms },
      ],
    });
    await screen.findByText('Protector');

    await user.click(screen.getByRole('button', { name: 'Add item' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Category'), 'Female');
    await user.type(within(dialog).getByLabelText('Brand'), 'FC2');
    await user.click(within(dialog).getByRole('combobox', { name: 'Unit of measure' }));
    await user.click(await screen.findByRole('option', { name: 'Box of 144' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(requests.find((request) => request.method === 'POST')).toMatchObject({
      url: '/condoms',
      body: { category: 'Female', brand: 'FC2', type: '', unit_of_measure_id: '2' },
    });
    await waitFor(() => {
      expect(
        requests.filter((request) => request.url === '/condoms' && request.method === 'GET'),
      ).toHaveLength(2);
    });
  });

  it('prefills the form when editing and saves with PUT', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<CondomsPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 200, body: { code: '201' } },
        { status: 200, body: condoms },
      ],
    });
    await screen.findByText('Protector');

    await user.click(screen.getByRole('button', { name: 'Actions for Protector · Male' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const brand = within(dialog).getByLabelText('Brand');
    expect(brand).toHaveValue('Protector');

    await user.clear(brand);
    await user.type(brand, 'Protector Plus');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(requests.find((request) => request.method === 'PUT')).toMatchObject({
        url: '/condoms/1',
        body: { brand: 'Protector Plus', unit_of_measure_id: '2' },
      });
    });
  });

  it('deletes an item after confirmation', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<CondomsPage />, {
      signedIn: true,
      replies: [...pageLoad, { status: 200, body: { code: '201' } }, { status: 200, body: [] }],
    });
    await screen.findByText('Protector');

    await user.click(screen.getByRole('button', { name: 'Actions for Protector · Male' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete item' }),
    );

    expect(await screen.findByText('No condom items yet')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'DELETE')).toMatchObject({
      url: '/condoms/1',
    });
  });
});
