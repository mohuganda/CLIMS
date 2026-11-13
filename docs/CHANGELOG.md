# Changelog

Notable changes to CLIMS. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Web app** in `frontend/`, imported from the `LMD_FE` prototype and rebuilt on Next.js 16,
  React 19, TypeScript, Tailwind CSS 4 and shadcn/ui, themed after the SalesOps dashboard reference in light
  mode with an optional dark theme. Decisions are recorded in `docs/adr/0001-frontend-stack.md`.
- Sign-in, sign-out and a route guard. Signing out or an expired session in one browser tab signs
  out the others.
- User management, condom items, condom stock and hotspots: searchable, sortable, paginated tables
  with create, edit and delete, Excel export, and loading, empty and error states.
- A hotspot map that plots the hotspots recorded in the system.
- Stock adjustments must state whether they add or distribute stock; neither is preselected.
- A mock API for developing the UI without a backend, with demo, worst-case and empty datasets
  (`npm run mock-api`).
- Unit and behaviour tests, with coverage enforced at 80% on domain code.
- ESLint (type-aware, strict, accessibility rules) and Prettier, run in CI with tests and build
  (`.github/workflows/ci.yml`).
- Security headers on every page, including a Content-Security-Policy that allows no inline
  script except the ones Next.js writes, each marked with a per-request nonce.

### Changed

- The web app takes the place of the Next.js welcome page added in 2.0.0 and keeps its images,
  Compose services and `BACKEND_URL` rewrites. The frontend CI job also checks formatting, runs
  the tests with coverage and audits shipped dependencies, and the production image accepts an
  optional `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` build argument.
- Screen addresses are consistent and no longer misspelled (for example `/moh/users` instead of
  `/moh/admin/userManagment`).
- The district "Condom items" link opens the condom catalogue. It previously opened a copy of the
  orders placeholder.
- Dashboard figures and charts that are not read from the API are labelled "Sample".
- Hotspot status is chosen from a list (active, pending, inactive) instead of typed freely. A
  record saved with another status keeps it.
- Organisation units are chosen by name instead of entered as a numeric id.

### Removed

- Template leftovers and duplicates from the prototype: dozens of unused or copied components and
  pages, the unlinked "JMS Duplicate" pages and hotspot verification stub, the "Other user" pages
  (a demo grid of fictional people), a US vector map with no data, and placeholder prose in
  Procurement.
- Header search, notification and message menus, which showed template content and did nothing.
- Date-range pickers on order screens, which filtered nothing.
- The "Export PDF" and "Send to MOH" buttons, which did nothing. User management gains a working
  Excel export.
- Ant Design, ApexCharts, styled-components, redux-persist, three unused data-grid libraries,
  webpack, and the `xlsx` package (unpatched advisories on npm).

### Security

- Every signed-in screen is behind the route guard. Previously no route was protected.
- The session token is attached to API requests in one place. A rejected token ends the session.
- Sign-out always ends the local session. Previously a network failure left the user signed in.
- Removed a Google Maps API key hardcoded in source; it is now build configuration. **The old key
  remains in the prototype repository's history and should be rotated or restricted.**
- The edit-user form no longer displays the user's existing password, and password fields are
  masked.
- Evidence upload no longer posts files to a third-party mock endpoint. It is switched off until
  the API can store documents.
- API responses are validated against schemas before use; server error details are never shown.
- New passwords must be at least 8 characters.
- Excel exports write text as text, so spreadsheet formulas in data cannot execute.
- The dashboard's hotlinked images and avatar service calls were removed; the app loads no
  third-party resources except Google Maps on the map page.
