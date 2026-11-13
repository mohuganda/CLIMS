# Lessons

Notable bugs and mistakes, with their root cause and what now prevents a repeat.

## 2026-11-12: Importing the web app

### A credential was committed to source

The prototype had a Google Maps API key as a string literal in a page component, in a public
repository.

- **Root cause:** there was no configuration mechanism, so the nearest place to put a value was the
  file that used it.
- **Now:** configuration is read from `NEXT_PUBLIC_*` variables and validated in `src/config/env.ts`.
  `.env.example` states that these values are public and must never hold a secret. A browser key is
  public by nature, so the real control is restricting it by referrer in Google Cloud.

### Screens presented invented numbers as facts

Dashboards showed a UI template's demo figures and chart data under real headings.

- **Root cause:** screens were built ahead of their endpoints with placeholder values inline, and
  nothing marked a placeholder as one, so it was indistinguishable from data in review and on
  screen.
- **Now:** all illustrative values live in one file whose header says what they are, and every
  component rendering one shows a "Sample" badge. An endpoint-less list shows an empty state.

### Failures were only reported in a toast

A save or delete that failed for a reason not tied to a field raised a toast and nothing else. A
toast disappears, is easy to miss, and is not reliably announced by screen readers.

- **Root cause:** the global mutation error handler made toasts the path of least resistance, and
  an accessibility review was the first thing to question it.
- **Now:** form and confirmation dialogs render the failure inside themselves and stay open. The
  global toast remains as a backstop for mutations with no surface of their own. Tests assert the
  message appears in the dialog.

### "1 of 1 hotspots are on the map"

A sentence was built with a hardcoded plural.

- **Root cause:** it was only ever looked at with several records. Tidy demo data hides every
  boundary: one, zero, missing, very long.
- **Now:** the sentence is a tested function covering 0, 1 and many. The mock API has `worst` and
  `empty` datasets, and `DESIGN.md` requires running a screen against both before it ships.

### A test passed alone and failed under load

A route-guard test timed out only when the whole suite ran with coverage.

- **Root cause:** pages load lazily, so a route change is an asynchronous module import followed by
  a render, and Testing Library's default one-second wait was too short on a busy machine. The
  failure looked like a logic bug but was a timing assumption.
- **Now:** the async wait is five seconds in `src/test/setup.ts`, with the reason written beside
  it. The suite was run three times in a row under coverage to confirm.

### A theme library logged an error on every page

`next-themes` works by rendering an inline script. React 19 does not run scripts rendered on the
client and logs an error each time; a strict Content-Security-Policy would block it as well.

- **Root cause:** it was pulled in as a dependency of a generated toast component and assumed to
  work because nothing looked wrong. The error only showed in the browser console.
- **Now:** a small theme provider in `src/components/theme/` replaces it. "The browser console is
  empty" is on the pre-ship checklist in `DESIGN.md`.

### A legitimate dependency was removed as suspicious

Generated components imported `cn` from a package named `cn`. It was taken for a stray or
typo-squatted package, uninstalled, and the imports rewritten, which also turned the project's
re-export into a file importing itself.

- **Root cause:** acting on an assumption. One registry lookup showed the package is published by
  the shadcn project and is how its current components import the helper.
- **Now:** nothing to enforce beyond the habit: check what an unfamiliar package is before removing
  it. The slip was caught within minutes because the type-check and tests were run immediately
  after.
