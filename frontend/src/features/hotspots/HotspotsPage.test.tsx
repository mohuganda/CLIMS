import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

import HotspotMapPage from './HotspotMapPage';
import HotspotsPage from './HotspotsPage';

const hotspots = [
  {
    id: 3,
    hotspot_name: 'Lugogo',
    contact_person_name: 'Okello James',
    contact_person_telephone: '0772000000',
    latitude: '0.3295',
    longtitude: '32.6016',
    organization_unit_id: 4,
    hotspot_status: 'under review',
  },
];
const pageLoad = [
  { status: 200, body: hotspots },
  { status: 200, body: [{ id: 4, name: 'Kampala Capital City Authority' }] },
];

describe('HotspotsPage', () => {
  it('lists hotspots with their organisation unit and status', async () => {
    renderApp(<HotspotsPage />, { signedIn: true, replies: pageLoad });

    const row = (await screen.findByText('Lugogo')).closest('tr');
    expect(within(row!).getByText('Kampala Capital City Authority')).toBeInTheDocument();
    expect(within(row!).getByText('under review')).toBeInTheDocument();
  });

  it('saves an edit without rewriting a status it does not recognise', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<HotspotsPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 200, body: { code: '201' } },
        { status: 200, body: hotspots },
      ],
    });
    await screen.findByText('Lugogo');

    await user.click(screen.getByRole('button', { name: 'Actions for Lugogo' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByLabelText('Hotspot name');
    await user.clear(name);
    await user.type(name, 'Lugogo Bypass');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(requests.find((request) => request.method === 'PUT')).toMatchObject({
        url: '/hotSpots/3',
        body: {
          hotspot_name: 'Lugogo Bypass',
          hotspot_status: 'under review',
          latitude: 0.3295,
          longtitude: 32.6016,
        },
      });
    });
  });

  it('puts a server error about "longtitude" on the longitude field', async () => {
    const user = userEvent.setup();
    renderApp(<HotspotsPage />, {
      signedIn: true,
      replies: [
        ...pageLoad,
        { status: 422, body: { errors: { longtitude: ['Longitude is outside Uganda.'] } } },
      ],
    });
    await screen.findByText('Lugogo');

    await user.click(screen.getByRole('button', { name: 'Actions for Lugogo' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText('Longitude is outside Uganda.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Longitude')).toHaveAttribute('aria-invalid', 'true');
  });

  it('deletes a hotspot after confirmation', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(<HotspotsPage />, {
      signedIn: true,
      replies: [...pageLoad, { status: 200, body: { code: '201' } }, { status: 200, body: [] }],
    });
    await screen.findByText('Lugogo');

    await user.click(screen.getByRole('button', { name: 'Actions for Lugogo' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Delete hotspot',
      }),
    );

    expect(await screen.findByText('No hotspots yet')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'DELETE')).toMatchObject({
      url: '/hotSpots/3',
    });
  });
});

describe('HotspotMapPage', () => {
  it('explains what to configure when no maps key is set, instead of a broken map', async () => {
    renderApp(<HotspotMapPage />, { signedIn: true, replies: [{ status: 200, body: hotspots }] });

    expect(await screen.findByText('The map is not set up')).toBeInTheDocument();
    expect(screen.getByText(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/)).toBeInTheDocument();
  });
});
