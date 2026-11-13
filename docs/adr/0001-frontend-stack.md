# ADR 0001: Frontend stack and how the prototype was imported

- **Status:** Accepted
- **Date:** 2026-11-12, revised 2026-11-14 (decision 1)
- **Applies to:** `frontend/`

## Context

`frontend/` was empty. The web client existed as a separate prototype repository, `LMD_FE`: a Vite
and React app on the TailAdmin template with Ant Design, ApexCharts and Redux. It was to become
this repository's frontend, held to the team's `practices.md`, and restyled to the
SalesOps dashboard reference in light mode using shadcn/ui components.

An audit of the prototype before importing it found:

- About a third of its code was unreachable template leftovers, and several reachable pages were
  near-identical copies of each other under different names.
- Only sign-in, users, condom items, stock and hotspots called an API. Every other screen showed
  hardcoded figures (including the template's demo chart data) as if they were live.
- No route was protected. A sign-out that failed on the network left the user signed in.
- A Google Maps API key and two different API base URLs were hardcoded in source. An "evidence
  upload" form posted files to a public mock endpoint.
- The edit-user form prefilled the user's password in a plain text field.
- 103 `@ts-ignore` comments, 139 `any`s, no lint configuration, no tests.

This repository's README, Dockerfile and Makefile, written before the import, assumed a Next.js
frontend. Its Go backend serves `/api/v1/auth` only.

While this work was in review, release 2.0.0 added a Next.js scaffold to `frontend/`: a welcome
page with an API readiness check, plus development and production images, Compose overrides, CI
and an image release pipeline built around it.

## Decisions

### 1. Build on Next.js, the framework the repository already uses

The first version of this decision kept the prototype's Vite single-page app, because the app is
entirely behind a sign-in and server rendering buys it little. It was reversed once release 2.0.0
had standardised on Next.js: keeping Vite meant replacing that release's frontend images, Compose
services, CI job and documentation with a second way of doing each. The app is now a Next.js 16
App Router project in the place of the scaffold, and the infrastructure around it is unchanged
apart from two build settings.

What that means in practice:

- Every screen is a `page.tsx` under `src/app`, and a layout puts the signed-in ones behind the
  guard and inside the shell. React Router is gone.
- The screens are client components. The session is a bearer token in the browser's storage, so
  the server cannot know who is signed in; it sends the document, the page title and a loader, and
  the app starts in the browser. Server-rendering the screens needs the session in a cookie, which
  is a backend change (see Consequences).
- The Content-Security-Policy allows no inline script except the ones Next.js writes, which carry
  a nonce that is new for every request. A nonce cannot be built ahead of time, so every page is
  rendered on request rather than at build.
- Components, the API layer and the tests did not change: they never depended on the bundler.

### 2. Rebuild the UI on shadcn/ui and Tailwind 4, not restyle Ant Design

The reference design is itself built from shadcn/ui on Tailwind 4, so matching it with another
component library would mean fighting that library's styling on every component. Ant Design and
ApexCharts were removed; Recharts (through shadcn's chart component) and lucide icons replace them.
The token mapping and its rules are in [`frontend/DESIGN.md`](../../frontend/DESIGN.md).

### 3. Keep the legacy API contract, isolated behind one layer

The screens use the legacy API's endpoints and quirks (failures as HTTP 200 with a `code`, numbers
as strings, the field name `longtitude`). The Go backend does not offer those endpoints, so
re-pointing the app was not possible. Instead the contract is confined to `src/lib/api/http.ts` and
each feature's `api.ts`, every response is validated against a schema, and the base URL comes from
configuration. Moving to the Go API later changes those files and nothing else.

### 4. Server data in TanStack Query; Redux holds only the session

The prototype copied every query result into component state and used one Redux slice as a
cross-page "which row is being edited" flag, so opening an edit dialog on one page opened dialogs on
others. Server data now lives only in the query cache, edit state is local to the page, and the
Redux store holds the session alone. Redux Toolkit was kept, rather than replaced by context,
because it is the team's established tool and the cost of keeping it is small.

### 5. Do not ship fabricated data as real

Screens without an endpoint were kept, since they record intended design, but changed so that
nothing invented reads as fact: illustrative figures are labelled "Sample" and come from one file,
lists with no endpoint show an empty state, and the evidence form is visibly switched off. Four
things were dropped rather than ported because they were demo content with no product meaning: a US
vector map with an empty data file, a grid of fictional people, a section of placeholder prose, and
a set of unlinked duplicate pages.

### 6. Dependencies are created at the composition root

The store, HTTP client, query client and storage are built in `src/providers/AppRoot.tsx` and passed down through
providers. There is no module-level store or client. This is what lets each test construct its own
isolated app (`src/test/renderApp.tsx`).

## Consequences

- The frontend cannot run against this repository's backend yet. A mock API (`frontend/dev/`)
  covers development; production needs the legacy API or new backend endpoints.
- The session token stays in `localStorage` because the API issues bearer tokens. An `HttpOnly`
  cookie would be safer and needs a backend change.
- Navigation is not filtered by role, as in the prototype. Doing so needs the API to state what
  each role may do.
- The prototype's git history was not carried over. It contains the hardcoded Maps key, which
  should be rotated or referrer-restricted regardless of this import.
- Table search, sort and page position are component state, not in the URL, so they are lost on
  reload and cannot be linked to.

## Alternatives considered

- **Keep the Vite single-page app and replace the Next.js scaffold.** This was the first version
  of decision 1. Rejected on review: it works, but it leaves the repository's images, Compose
  files, CI and release tooling to be rewritten around a second frontend stack.
- **Mount the existing React Router app inside one catch-all Next.js route.** Rejected: it is the
  quickest port, but the result is Next.js in name only, with none of its routing, metadata or
  code splitting, and two routers to reason about.

- **`git subtree` to preserve history.** Rejected: nearly every file is replaced, so the history
  would describe code that no longer exists, and it would import a committed credential.
- **Copy the prototype as-is and fix it incrementally.** Rejected: it had no type-check step and imported symbols that do not
  exist, and the security problems (unprotected routes, hardcoded key, password echo) should not land on `main`
  even briefly.
