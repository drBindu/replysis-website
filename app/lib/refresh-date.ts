/**
 * The date a paid account's answers refresh, as shown to the customer (bug round 38, 2026-11-07).
 *
 * A monthly subscription refills when its renewal is paid, on the subscription's own day. creditsResetDate sits three days
 * past that renewal (a safety margin for late Indian card mandates), so showing it told a customer who subscribed on the
 * 15th "Refreshes Dec 18" for a refill that came on Dec 15. Annual plans and everything else refill on creditsResetDate.
 * The backend's FirestoreCreditsService.refreshShown is the same rule, for the desktop apps.
 */
export function refreshShownDate(
  profile: {
    stripeSubscriptionId?: unknown;
    stripeBillingInterval?: unknown;
    stripeCurrentPeriodEnd?: unknown;
    creditsResetDate?: unknown;
  } | null | undefined,
  now = Date.now(),
): unknown {
  const end = profile?.stripeCurrentPeriodEnd;
  if (
    profile?.stripeSubscriptionId &&
    profile.stripeBillingInterval === "monthly" &&
    typeof end === "number" &&
    end * 1000 > now
  ) {
    return end;
  }
  return profile?.creditsResetDate;
}
