/**
 * What a refund or a dispute takes back (owner, 2026-11-02): a full refund or a dispute over the whole charge removes
 * what was bought; a partial one changes nothing and only tells the owner. Pure rules, checked by scripts/check-refunds.mjs;
 * the Stripe webhook does the reading and writing.
 */

export type Purchase =
  | { kind: "pack"; credits: number }
  | { kind: "minutes"; minutes: number }
  | { kind: "plan_pass" | "mock_pass" | "maya_pass" };

/** A one-time purchase, from the payment's metadata. Null means a subscription invoice, or nothing we can name. */
export function purchaseFromMetadata(metadata: Record<string, unknown> | null | undefined): Purchase | null {
  const type = metadata?.purchaseType;
  if (type === "plan_pass" || type === "mock_pass" || type === "maya_pass") return { kind: type };
  const minutes = Number(metadata?.minutes);
  if (Number.isFinite(minutes) && minutes > 0) return { kind: "minutes", minutes };
  const credits = Number(metadata?.credits);
  if (Number.isFinite(credits) && credits > 0) return { kind: "pack", credits };
  return null;
}

export function isFullRefund(charge: { refunded?: unknown; amount?: unknown; amount_refunded?: unknown }): boolean {
  const amount = Number(charge.amount ?? 0);
  return charge.refunded === true || (amount > 0 && Number(charge.amount_refunded ?? 0) >= amount);
}

export function isFullDispute(disputeAmount: unknown, chargeAmount: unknown): boolean {
  const amount = Number(chargeAmount ?? 0);
  return amount > 0 && Number(disputeAmount ?? 0) >= amount;
}

/** A pack or minutes taken back: what is held goes down by that much, never below zero. */
export function afterTakingBack(held: unknown, amount: number): number {
  return Math.max(0, Math.max(0, Number(held ?? 0)) - amount);
}

/**
 * The end of a month paid once after one payment is taken back. Paying twice adds 30 days each, so only one month goes;
 * null means nothing is left of it.
 */
export function endAfterTakingBackMonth(end: unknown, now: number): string | null {
  const running = Date.parse(String(end ?? ""));
  if (!Number.isFinite(running)) return null;
  const left = running - 30 * 86_400_000;
  return left > now ? new Date(left).toISOString() : null;
}
