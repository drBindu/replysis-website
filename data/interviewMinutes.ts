/**
 * Interview minutes for India: Rs 5 a minute, bought in any amount from 15 to 600 minutes (owner, 2026-10-16).
 *
 * A minute is a minute of the interviewer speaking, the same meter the app already reports once a minute.
 * While minutes are left, answers inside them use no answers from the plan. Auto add, when switched on,
 * buys AUTO_ADD_MINUTES more with the saved card as the balance runs out.
 *
 * Shown and sold only to India; the checkout checks the country again on the server.
 */
export const RUPEES_PER_MINUTE = 5;
export const MIN_MINUTES = 15;
export const MAX_MINUTES = 600;
export const MINUTE_STEP = 15;
export const AUTO_ADD_MINUTES = 30;
/** Auto add starts when this many minutes or fewer are left, so the interview never stops. */
export const AUTO_ADD_WHEN_LEFT = 2;

export function validMinutes(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isInteger(n) || n < MIN_MINUTES || n > MAX_MINUTES || n % MINUTE_STEP !== 0) return null;
  return n;
}

export const rupeesFor = (minutes: number) => minutes * RUPEES_PER_MINUTE;

/** Spends reported listening from bought minutes first: [balance left, minutes that count toward the month]. */
export function spendMinutes(balance: number, add: number): [number, number] {
  const b = Math.max(0, Number.isFinite(balance) ? balance : 0);
  const a = Math.max(0, Number.isFinite(add) ? add : 0);
  const fromBalance = Math.min(b, a);
  return [b - fromBalance, a - fromBalance];
}
