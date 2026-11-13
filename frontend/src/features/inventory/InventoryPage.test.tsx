import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

import InventoryPage from './InventoryPage';

const inventory = [
  {
    id: 7,
    condom_id: 1,
    quantity_in_stock: '1250000',
    batch_number: 'PR-2026-0412',
    unit_of_measure_id: 2,
    condom_unit_cost: 350,
    date_of_delivery: '2026-01-15',
    organization_unit_id: 3,
  },
];
/** Replies in the order the page asks: stock, condoms, units, organisation units. */
const pageLoad = [
  { status: 200, body: inventory },
  { status: 200, body: [{ id: 1, category: 'Male', brand: 'Protector' }] },
  { status: 200, body: [{ id: 2, name: 'Box of 144' }] },
  { status: 200, body: [{ id: 3, name: 'Gulu District Health Office' }] },
];

describe('InventoryPage', () => {
  it('shows stock with names resolved and quantities formatted', async () => {
    renderApp(<InventoryPage />, { signedIn: true, replies: pageLoad });

    const row = (await screen.findByText('PR-2026-0412')).closest('tr');
    expect(within(row!).getByText('Protector · Male')).toBeInTheDocument();
    expect(within(row!).getByText('1,250,000')).toBeInTheDocument();
    expect(within(row!).getByText('Box of 144')).toBeInTheDocument();
    expect(within(row!).getByText('Gulu District Health Office')).toBeInTheDocument();
  });

  it('records a distribution against a batch, requiring the direction to be chosen', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<InventoryPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 200, body: { code: '201' } },
        { status: 200, body: inventory },
      ],
    });
    await screen.findByText('PR-2026-0412');

    await user.click(screen.getByRole('button', { name: 'Actions for batch PR-2026-0412' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Adjust stock' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Quantity'), '200');

    // No direction chosen yet: nothing may be sent.
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));
    expect(
      await within(dialog).findByText('Choose what kind of change this is.'),
    ).toBeInTheDocument();
    expect(requests.some((request) => request.method === 'PUT')).toBe(false);

    await user.click(within(dialog).getByRole('combobox', { name: 'Adjustment type' }));
    await user.click(await screen.findByRole('option', { name: /Distribution/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));

    await waitFor(() => {
      expect(requests.find((request) => request.method === 'PUT')).toMatchObject({
        url: '/condomInventories/7',
        body: {
          submitted_type: 'distribution',
          quantity: 200,
          unit_of_measure_id: '2',
          organization_unit_id: '3',
        },
      });
    });
  });

  it('deletes a stock record after confirmation', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<InventoryPage />, {
      signedIn: true,
      replies: [...pageLoad, { status: 200, body: { code: '201' } }, { status: 200, body: [] }],
    });
    await screen.findByText('PR-2026-0412');

    await user.click(screen.getByRole('button', { name: 'Actions for batch PR-2026-0412' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete record' }),
    );

    expect(await screen.findByText('No stock recorded yet')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'DELETE')).toMatchObject({
      url: '/condomInventories/7',
    });
  });
});
