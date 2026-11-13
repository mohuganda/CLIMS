import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { DataTable, type DataTableColumn } from './DataTable';

interface Site {
  id: number;
  name: string | null;
  stock: number | null;
}

const columns: DataTableColumn<Site>[] = [
  { id: 'name', header: 'Name', value: (site) => site.name },
  { id: 'stock', header: 'Stock', value: (site) => site.stock, numeric: true },
];

const sites: Site[] = Array.from({ length: 23 }, (_, index) => ({
  id: index + 1,
  name: `Site ${String(index + 1).padStart(2, '0')}`,
  stock: (index * 37) % 100,
}));

function renderTable(props: Partial<Parameters<typeof DataTable<Site>>[0]> = {}) {
  return render(
    <DataTable
      label="Sites"
      columns={columns}
      rows={sites}
      getRowId={(site) => site.id}
      emptyTitle="No sites yet"
      emptyDescription="Add a site to get started."
      {...props}
    />,
  );
}

/** The first-column text of each body row, in display order. */
const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);

describe('DataTable', () => {
  it('shows the first page and how many rows there are in total', () => {
    renderTable();
    expect(names()).toHaveLength(10);
    expect(screen.getByText('Showing 1–10 of 23')).toBeInTheDocument();
  });

  it('moves between pages and disables the ends', async () => {
    const user = userEvent.setup();
    renderTable();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Page 3' }));

    expect(names()).toEqual(['Site 21', 'Site 22', 'Site 23']);
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('filters as the user types and returns to the first page', async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    await user.type(screen.getByRole('searchbox', { name: 'Search sites' }), 'SITE 02');

    expect(names()).toEqual(['Site 02']);
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();
  });

  it('offers to clear a search that matches nothing', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(names()).toHaveLength(10);
  });

  it('sorts a column ascending, then descending, then not at all, and says so to assistive tech', async () => {
    const user = userEvent.setup();
    renderTable();
    const header = screen.getByRole('columnheader', { name: /Stock/ });
    const toggle = within(header).getByRole('button');

    await user.click(toggle);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(names()[0]).toBe('Site 01');

    await user.click(toggle);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(names()[0]).toBe('Site 09');

    await user.click(toggle);
    expect(header).not.toHaveAttribute('aria-sort');
  });

  it('shows the empty state, without a search box, when there are no rows', () => {
    renderTable({ rows: [] });
    expect(screen.getByText('No sites yet')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows placeholders, not the empty state, while loading', () => {
    renderTable({ rows: undefined, isLoading: true });
    expect(screen.queryByText('No sites yet')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Sites' })).toHaveAttribute('aria-busy', 'true');
  });

  it('shows a safe error message with a way to retry when loading fails', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderTable({
      rows: undefined,
      error: new ApiError({ kind: 'network', message: 'Could not reach the server.' }),
      onRetry,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load sites');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps showing rows it already has when a background refresh fails', () => {
    renderTable({ error: new ApiError({ kind: 'server', message: 'Server problem.' }) });
    expect(names()).toHaveLength(10);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a dash for missing values and never the text "null"', () => {
    renderTable({ rows: [{ id: 1, name: null, stock: null }] });
    expect(names()).toEqual(['—']);
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('renders markup in data as text, not as HTML', () => {
    renderTable({ rows: [{ id: 1, name: '<img src=x onerror=alert(1)>', stock: 1 }] });
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
