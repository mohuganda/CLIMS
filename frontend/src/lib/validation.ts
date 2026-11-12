import { z } from 'zod';

/**
 * Schemas for numbers typed into text inputs. Inputs hold strings, so each
 * takes the raw text and yields a number, with messages that say what to type.
 */

interface Range {
  min: number;
  max: number;
}

/** A whole number within `range`, e.g. a quantity. `noun` completes "Enter …". */
export function wholeNumber(noun: string, { min, max }: Range) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${noun}.`)
    .regex(/^\d+$/, 'Use a whole number, with no decimals or symbols.')
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `Must be at least ${min.toLocaleString('en')}.`)
        .max(max, `Must be at most ${max.toLocaleString('en')}.`),
    );
}

/** A decimal number within `range`, e.g. a unit cost or a coordinate. */
export function decimalNumber(noun: string, { min, max }: Range) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${noun}.`)
    .regex(/^-?\d+(\.\d+)?$/, 'Use digits only, with a dot for decimals.')
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `Must be at least ${min.toLocaleString('en')}.`)
        .max(max, `Must be at most ${max.toLocaleString('en')}.`),
    );
}

/** A calendar date (`YYYY-MM-DD`, as a date input produces) that is not in the future. */
export function pastOrPresentDate(noun: string, today: () => Date = () => new Date()) {
  return z
    .string()
    .min(1, `Enter ${noun}.`)
    .refine((value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return false;
      const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
      const date = new Date(year, month - 1, day);
      // Reject impossible dates that Date would roll over, such as 31 February.
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }, 'Enter a valid date.')
    .refine((value) => value <= toDateInputValue(today()), 'The date cannot be in the future.');
}

/** A date as the `YYYY-MM-DD` string a date input uses, in local time. */
export function toDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
