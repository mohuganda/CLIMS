export type StatusTone = 'positive' | 'caution' | 'negative' | 'neutral';

const POSITIVE = new Set(['active', 'approved', 'verified', 'delivered', 'completed']);
const CAUTION = new Set(['pending', 'pending verification', 'in progress', 'processing']);
const NEGATIVE = new Set(['inactive', 'suspended', 'rejected', 'declined', 'cancelled', 'blocked']);

/** The tone a status word is shown in. Unrecognised words are neutral, never guessed at. */
export function statusTone(status: string | null | undefined): StatusTone {
  const key = status?.trim().toLowerCase() ?? '';
  if (POSITIVE.has(key)) return 'positive';
  if (CAUTION.has(key)) return 'caution';
  if (NEGATIVE.has(key)) return 'negative';
  return 'neutral';
}
