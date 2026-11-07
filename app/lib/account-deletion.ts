// What deleting an account must do besides removing the record (round 31, 2026-11-07).
// Kept free of Firebase so scripts/check-account-deletion.mjs can test it directly.

// Stripe statuses that still charge, or will charge, the card. Deleting an account that still has one left the customer
// being billed every month for an account that no longer exists.
export const CHARGING_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);

export function chargingSubscriptionIds(list: Array<{ id?: unknown; status?: unknown }> | null | undefined): string[] {
  return (list ?? [])
    .filter((s) => typeof s?.id === "string" && CHARGING_STATUSES.has(String(s.status)))
    .map((s) => s.id as string);
}

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

/**
 * Cancels, at once, every subscription on the customer that still charges (a plan, Practice and any spare one).
 * Throws when Stripe cannot be read or a cancel fails, so the caller stops before deleting anything.
 */
export async function cancelChargingSubscriptions(customerId: string, secret: string, fetchImpl: FetchLike): Promise<string[]> {
  if (!customerId) return [];
  if (!secret) throw new Error("Stripe is not configured");
  const headers = { Authorization: `Bearer ${secret}` };
  const res = await fetchImpl(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`, { headers });
  if (!res.ok) throw new Error(`Stripe list failed ${res.status}`);
  const ids = chargingSubscriptionIds((await res.json())?.data);
  for (const id of ids) {
    const cancel = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE", headers });
    if (!cancel.ok) throw new Error(`Stripe cancel failed ${cancel.status}`);
  }
  return ids;
}

export type DeletionRequestRow = { uid: string; email: string; requestedAtMs: number; daysWaiting: number };

/** Requests still waiting for the owner, oldest first. Dismissed and completed ones are left out. */
export function pendingDeletionRequests(
  docs: Array<{ id: string; data: Record<string, any> }>,
  now: number = Date.now(),
): DeletionRequestRow[] {
  return docs
    .filter((d) => d.data?.status === "requested")
    .map((d) => {
      const raw = d.data.requestedAt;
      const ms = typeof raw?.toMillis === "function" ? raw.toMillis() : Date.parse(String(raw ?? ""));
      const at = Number.isFinite(ms) ? ms : now;
      return { uid: d.id, email: typeof d.data.email === "string" ? d.data.email : "", requestedAtMs: at, daysWaiting: Math.floor((now - at) / 86_400_000) };
    })
    .sort((a, b) => a.requestedAtMs - b.requestedAtMs);
}
