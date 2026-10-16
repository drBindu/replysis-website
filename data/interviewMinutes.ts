/**
 * Interview minutes for India, bought in any amount from 15 to 600 minutes: Rs 5 a minute at the smallest, cheaper per
 * minute as the amount grows, every amount under the Pro price (owner, 2026-10-16).
 *
 * A minute is a minute of the interviewer speaking, the same meter the app already reports once a minute.
 * While minutes are left, answers inside them use no answers from the plan. Auto add, when switched on,
 * buys AUTO_ADD_MINUTES more with the saved card as the balance runs out.
 *
 * Shown and sold only to India; the checkout checks the country again on the server.
 */
/** The smallest amount is Rs 5 a minute; every larger amount is cheaper per minute (owner, 2026-10-16). */
export const RUPEES_PER_MINUTE = 5;
/** India Pro is Rs 699 a month. Every amount of minutes costs less than that (owner, 2026-10-16). */
export const INDIA_PRO_RUPEES = 699;

/**
 * Prices at fixed points, minutes to rupees. Between two points the price follows a straight line,
 * rounded to a whole rupee. 15 minutes is Rs 5 a minute; 600 minutes is Rs 649, about Rs 1.08 a minute,
 * still under Pro. Cost check: a minute of speech plus its answers costs us about Rs 0.75, so the top
 * amount keeps about 30% even if every minute is speech.
 */
export const PRICE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [15, 75],
  [30, 140],
  [60, 249],
  [120, 399],
  [180, 499],
  [300, 599],
  [600, 649],
];
export const MIN_MINUTES = 15;
export const MAX_MINUTES = 600;
export const MINUTE_STEP = 15;
export const AUTO_ADD_MINUTES = 15;   // owner, 2026-10-16: 15, not 30
/** Auto add starts when this many minutes or fewer are left, so the interview never stops. */
export const AUTO_ADD_WHEN_LEFT = 2;

export function validMinutes(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isInteger(n) || n < MIN_MINUTES || n > MAX_MINUTES || n % MINUTE_STEP !== 0) return null;
  return n;
}

export function rupeesFor(minutes: number): number {
  const pts = PRICE_POINTS;
  if (minutes <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [m0, r0] = pts[i - 1];
    const [m1, r1] = pts[i];
    if (minutes <= m1) return Math.round(r0 + ((minutes - m0) / (m1 - m0)) * (r1 - r0));
  }
  return pts[pts.length - 1][1];
}

/** Rupees a minute at this amount, to two places, for showing next to the total. */
export const perMinute = (minutes: number) => (rupeesFor(minutes) / minutes).toFixed(2);

/** Spends reported listening from bought minutes first: [balance left, minutes that count toward the month]. */
export function spendMinutes(balance: number, add: number): [number, number] {
  const b = Math.max(0, Number.isFinite(balance) ? balance : 0);
  const a = Math.max(0, Number.isFinite(add) ? add : 0);
  const fromBalance = Math.min(b, a);
  return [b - fromBalance, a - fromBalance];
}
