import { readFileSync } from 'node:fs';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { sessionEnded } from '@/features/auth/authSlice';
import { AppUnderTest, routedPaths } from '@/test/AppUnderTest';
import { testRouter } from '@/test/navigation';
import { renderApp } from '@/test/renderApp';

import { signInHref } from './guards';
import { navGroups } from './navGroups';
import { HOME_PATH, SIGN_IN_PATH } from './paths';

const routes = <AppUnderTest />;

describe('navigation table', () => {
  it('lists exactly the screens that have a page', () => {
    const listed = navGroups.flatMap((group) => group.items.map((item) => item.path)).sort();
    expect(routedPaths.filter((path) => path !== SIGN_IN_PATH)).toEqual(listed);
  });

  it('redirects the bare address to the default workspace', () => {
    // next.config.ts cannot import from src, so the destination is written there too.
    const config = readFileSync('next.config.ts', 'utf8');
    expect(config).toContain(`{ source: '/', destination: '${HOME_PATH}', permanent: false }`);
  });
});

describe('route guard', () => {
  it('sends a signed-out visitor to sign-in instead of showing a protected page', async () => {
    const { requests } = renderApp(routes, { route: '/moh/users' });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User management' })).not.toBeInTheDocument();
    // The protected page never mounted, so it never asked the API for anything.
    expect(requests).toHaveLength(0);
    expect(testRouter.location).toBe('/sign-in?from=%2Fmoh%2Fusers');
  });

  it('keeps the sign-in address clean when the visitor was headed for the default page', () => {
    expect(signInHref('/moh')).toBe('/sign-in');
    expect(signInHref('/')).toBe('/sign-in');
    expect(signInHref('/dcfp/stock?page=2')).toBe('/sign-in?from=%2Fdcfp%2Fstock%3Fpage%3D2');
  });

  it('does not follow a return address that leaves the app', async () => {
    renderApp(routes, { route: '/sign-in?from=%2F%2Fevil.example', signedIn: true });
    expect(await screen.findByRole('heading', { name: 'MOH dashboard' })).toBeInTheDocument();
    expect(testRouter.location).toBe('/moh');
  });

  it('shows the requested page to a signed-in user', async () => {
    renderApp(routes, { route: '/moh/users', signedIn: true });
    expect(await screen.findByRole('heading', { name: 'User management' })).toBeInTheDocument();
  });

  it('sends a signed-in user away from the sign-in page', async () => {
    renderApp(routes, { route: '/sign-in', signedIn: true });
    expect(await screen.findByRole('heading', { name: 'MOH dashboard' })).toBeInTheDocument();
  });

  it('returns to sign-in the moment the session ends', async () => {
    const { store } = renderApp(routes, { route: '/moh/users', signedIn: true });
    await screen.findByRole('heading', { name: 'User management' });

    store.dispatch(sessionEnded());

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('signs the user out when the API rejects their token', async () => {
    const { store } = renderApp(routes, {
      route: '/moh/users',
      signedIn: true,
      replies: [{ status: 401, body: { message: 'Unauthenticated.' } }],
    });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(store.getState().auth.session).toBeNull();
  });

  it('shows a not-found page for an unknown address, inside the app', async () => {
    renderApp(routes, { route: '/no/such/page', signedIn: true });
    expect(await screen.findByText('There is no page at this address')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});

describe('signing in', () => {
  it('signs in and lands on the page the visitor originally asked for', async () => {
    const user = userEvent.setup();
    const { store, requests } = renderApp(routes, {
      route: '/dcfp/stock',
      replies: [
        { status: 200, body: { code: '200', token: 'tok', user: { id: 3, username: 'okello' } } },
        { status: 200, body: [] },
      ],
    });

    await user.type(await screen.findByLabelText('Username'), 'okello');
    await user.type(screen.getByLabelText('Password'), 'a-test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Condom stock' })).toBeInTheDocument();
    expect(store.getState().auth.session?.token).toBe('tok');
    expect(requests[0]).toMatchObject({ url: '/login', authorization: null });
  });

  it('explains wrong credentials next to the form and stays signed out', async () => {
    const user = userEvent.setup();
    const { store } = renderApp(routes, {
      route: '/sign-in',
      replies: [{ status: 200, body: { code: '401', message: 'Invalid username or password' } }],
    });

    await user.type(await screen.findByLabelText('Username'), 'okello');
    await user.type(screen.getByLabelText('Password'), 'not-the-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
    expect(store.getState().auth.session).toBeNull();
    // What was typed is kept so the user can correct it.
    expect(screen.getByLabelText('Username')).toHaveValue('okello');
  });

  it('does not call the API until both fields are filled in', async () => {
    const user = userEvent.setup();
    const { requests } = renderApp(routes, { route: '/sign-in' });

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});

describe('theme', () => {
  it('starts light, switches to dark on request and remembers the choice', async () => {
    const user = userEvent.setup();
    const { storage } = renderApp(routes, { route: '/moh/procurement', signedIn: true });
    await screen.findByRole('heading', { name: 'Procurement' });
    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(storage.getItem('clims.theme')).toBe('"dark"');

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('signing out', () => {
  it('ends the session, clears storage and returns to sign-in', async () => {
    const user = userEvent.setup();
    const { store, storage, requests } = renderApp(routes, { route: '/moh/users', signedIn: true });
    await screen.findByRole('heading', { name: 'User management' });

    await user.click(screen.getByRole('button', { name: /Account menu/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(store.getState().auth.session).toBeNull();
    expect(storage.getItem('clims.session')).toBeNull();
    await waitFor(() => {
      expect(requests.some((request) => request.url === '/logout')).toBe(true);
    });
  });

  it('still signs out locally when the server cannot be reached', async () => {
    const user = userEvent.setup();
    const { store } = renderApp(routes, {
      route: '/moh/procurement',
      signedIn: true,
      replies: [{ failure: 'network' }],
    });
    await screen.findByRole('heading', { name: 'Procurement' });

    await user.click(screen.getByRole('button', { name: /Account menu/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(store.getState().auth.session).toBeNull();
  });
});
