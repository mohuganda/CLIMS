const numberFormat = new Intl.NumberFormat('en-UG');
const dateFormat = new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium' });

/** Shown wherever a value is missing, so an empty cell is never ambiguous. */
export const EMPTY_VALUE = '—';

/** Formats a count with thousands separators; anything non-numeric becomes the empty marker. */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? numberFormat.format(number) : EMPTY_VALUE;
}

/** Formats an ISO date or timestamp as a calendar date; unparseable input becomes the empty marker. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE;
  // A date-only value is a calendar day, not an instant: parsing it as UTC
  // midnight would show the previous day west of Greenwich.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY_VALUE : dateFormat.format(date);
}

/** Text for a possibly missing string. */
export function formatText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  const text = String(value).trim();
  return text === '' ? EMPTY_VALUE : text;
}

const GENERATIONAL_SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** The first user-perceived character of a word: a whole emoji or accented letter, never half of one. */
function firstGrapheme(word: string): string {
  for (const { segment } of graphemes.segment(word)) return segment;
  return '';
}

/** Up to two initials for an avatar, from a name or username. */
export function initialsOf(name: string | null | undefined): string {
  const allWords = (name ?? '').trim().split(/\s+/).filter(Boolean);
  // "William Montgomery III" is W. M., not W. I.
  const withoutSuffix = allWords.filter((word) => !GENERATIONAL_SUFFIX.test(word));
  const words = withoutSuffix.length > 0 ? withoutSuffix : allWords;
  const first = words[0];
  if (!first) return '?';
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return [first, last]
    .filter((word): word is string => word !== undefined)
    .map(firstGrapheme)
    .join('')
    .toUpperCase();
}
