/** Each share as a whole-number percentage of the total. Zero total gives all zeros. */
export function toPercentages(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total === 0) return values.map(() => 0);
  return values.map((value) => Math.round((Math.max(0, value) / total) * 100));
}
