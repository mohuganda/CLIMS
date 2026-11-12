# Design system

The visual language of the CLIMS web app. Read this before adding or changing UI.

## Source

The look follows the [SalesOps Dashboard](https://v0.app/templates/salesops-dashboard-9q2Mfgu6cDi)
reference: a 260px sidebar with a green active marker, a 64px translucent header, bordered 12px
cards, uppercase table headers, tinted status chips, DM Sans. Components are shadcn/ui
(`radix-nova` style, Radix primitives) on Tailwind CSS 4.

The reference ships in dark mode only. **Light is this product's theme**: its hues re-pitched for
a white surface. Dark is available from the header toggle and uses the reference's own values. The
app never follows the operating system's preference.

## Tokens

Defined in `src/styles/globals.css`. Always use the token, never a raw colour.

| Token                          | Light                                | Use                                                             |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------- |
| `background`                   | `#fafafb`                            | Page canvas                                                     |
| `card`, `popover`              | `#ffffff`                            | Surfaces                                                        |
| `foreground`                   | `#0c0d0f`                            | Text                                                            |
| `muted-foreground`             | `#62666d`                            | Secondary text, placeholders (5.8:1 on card)                    |
| `secondary`, `muted`, `accent` | `#f2f3f5`                            | Quiet fills, hover and selected backgrounds                     |
| `border`                       | `#e4e6e9`                            | Card and divider hairlines                                      |
| `input`                        | `#8b9097`                            | Form field outlines (3.2:1, see below)                          |
| `primary`                      | `#45ba50`                            | **Fills only**: primary buttons, active page, progress, markers |
| `primary-foreground`           | `#020203`                            | Text on a primary fill (8.3:1)                                  |
| `success`                      | `#177534`                            | **Green text and icons**; positive status                       |
| `warning`                      | `#a84c06`                            | Caution status                                                  |
| `destructive`                  | `#c62828`                            | Errors, destructive actions, negative status                    |
| `info`                         | `#0a6a9b`                            | Informational status                                            |
| `ring`                         | `#2f9e42`                            | Focus ring                                                      |
| `chart-1` … `chart-5`          | blue, green, purple, orange, magenta | Chart series, in that fixed order                               |

Radius is 8px (`rounded-lg`) for controls and 12px (`rounded-xl`) for cards. Type is DM Sans,
self-hosted; numbers that are compared use `tabular-nums`.

### Three rules that are easy to get wrong

1. **`primary` is a fill, `success` is text.** The reference green is 2.5:1 on white, which is
   fine behind near-black text and unreadable as text. Green words, links and icons use `success`.
2. **Field outlines use `input`, not `border`.** On a white card the outline is the only thing
   marking a field, so it carries 3:1. Cards and dividers keep the lighter `border`.
3. **Status colours pass on their own tint.** Chips are `bg-<status>/10 text-<status>`; each
   status colour was chosen so its text is at least 4.5:1 on that tint. The word carries the
   meaning; colour only reinforces it.

`accent` is deliberately neutral. The reference names its green "accent", but shadcn components
use `accent` for hover backgrounds, which must stay quiet. Its green is this system's `primary`.

## Building blocks

Reach for these before writing markup.

| Need                      | Use                                                                  |
| ------------------------- | -------------------------------------------------------------------- |
| A list of records         | `components/data-table/DataTable` (search, sort, paging, all states) |
| Per-row actions           | `components/data-table/RowActions`                                   |
| A headline figure         | `components/StatCard` in a `StatCardGrid`                            |
| A create or edit form     | `components/form/FormDialog` with `TextField` and `SelectField`      |
| Confirming a deletion     | `components/ConfirmDialog` (an alert dialog, never a plain dialog)   |
| Nothing to show           | `components/states/EmptyState`                                       |
| Failed to load            | `components/states/ErrorState` (says what failed, offers retry)      |
| A status word             | `components/StatusBadge`                                             |
| Change over time          | `components/charts/TrendChart`                                       |
| A few categories compared | `components/charts/ColumnChart`                                      |
| Parts of a whole          | `components/charts/ShareList` (labelled bars, not a donut)           |
| A figure that is not live | `SampleBadge` on it, or `SampleDataNotice` for a whole page          |

`components/ui/` is generated by the shadcn CLI (`npx shadcn@latest add <name>`). Edit a
primitive only to align it with the tokens above, and keep the edit small so
`npx shadcn@latest diff` stays readable.

## Every screen has

- **A page title** in the header (from the route table) and one line under it saying what the page
  is for.
- **All five states**: loading (skeletons shaped like the content), empty (with the next step),
  error (what failed, how to recover), partial (missing values show `—`), and populated.
- **Honest data.** A number that is not read from the API is marked as sample data. See the README.
- **Copy that names things.** Buttons say what they do ("Delete user", not "OK"). Errors say what
  happened and what to do next. Sentence case throughout.

## Charts

- Colour comes last, in the fixed `chart-1…5` order. A series keeps its colour when others are
  filtered out. Red is not a series colour; it is reserved for `destructive`.
- 2px lines, area fill at 10%, columns at most 24px wide with a 4px rounded top, solid hairline
  grid, one y-axis.
- Two or more series get a legend; one series is named by the card title.
- Every chart has a tooltip and a table view (`ChartCard` provides the switch), so no value is
  reachable only by hovering.
- Text in a chart uses text tokens, never the series colour.

The light and dark series colours were checked for colour-vision separation and 3:1 against their
surface. If you change one, check the set again.

## Before a screen ships

1. Look at it in a browser at about 1440, 768 and 390px wide, in both themes.
2. Run it against `MOCK_DATA=worst` and `MOCK_DATA=empty`. Nothing may overflow the page, hide a
   row's actions, or print `null`, `undefined` or `NaN`.
3. Tab through it. Every control is reachable, shows focus, and has a name. Dialogs trap focus and
   Escape closes them.
4. Make each request fail (`MOCK_FAIL=<resource>`) and check the message is useful and safe.
5. Check the browser console is empty.
