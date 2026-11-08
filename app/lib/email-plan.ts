// Which customer emails the hourly timer may send, kept apart from the route so the rules can be checked on their own.
// Round 27 (2026-11-07): one person could get two emails in the same minute (the Maya taste nudge and the out of answers
// email are separate kinds), a paying Pro customer got "Keep practising with Maya" with the Practice price, and a failed
// send kept its claim so it was never tried again.
// No imports: scripts/check-email-plan.mjs runs this file directly with node.

/** At most one email from us to a person in this long, whatever the kind (follow-up, upgrade, trial reminder). */
export const CUSTOMER_EMAIL_GAP_MS = 12 * 3600_000;

/**
 * The _alerts keys that hold a customer email for this account: the claim doc's sentAt is when it went out. The welcome
 * email is left out on purpose: the follow-up is meant to arrive 6 hours after it, while the 1 day trial still runs.
 */
export function customerEmailKeys(uid: string): string[] {
  return [
    `followup-${uid}`,
    `upgrade-maya-taste-${uid}`,
    `upgrade-out-of-answers-${uid}`,
    `trial-reminder-${uid}`,
  ];
}

/** Whether a customer email went to this person too recently for another one now. sentAt values are milliseconds. */
export function emailedRecently(sentAts: (number | null | undefined)[], now: number, gap = CUSTOMER_EMAIL_GAP_MS): boolean {
  return sentAts.some((at) => typeof at === "number" && Number.isFinite(at) && at > 0 && now - at < gap);
}

/**
 * The Maya taste nudge goes to someone who had the one free interview and has no Maya now. Never to a paying customer: it
 * sells the Practice plan, and Pro customers already pay us (they can add Maya from Account). The route works out paid
 * (isPaidPlan) and hasMaya (mayaAccess state ok).
 */
export function mayaTasteDue(paid: boolean, hasMaya: boolean, tastedAt: number | null, now: number): boolean {
  if (!tastedAt) return false;
  if (now - tastedAt <= 3600_000 || now - tastedAt >= 7 * 24 * 3600_000) return false;
  return !paid && !hasMaya;
}

/** One upgrade email per person per run. Out of answers wins: it is the one that stops their interviews today. */
export function onePerPerson<T extends { uid: string; kind: "maya-taste" | "out-of-answers" }>(list: T[]): T[] {
  const byUid = new Map<string, T>();
  for (const item of list) {
    const had = byUid.get(item.uid);
    if (!had || (had.kind === "maya-taste" && item.kind === "out-of-answers")) byUid.set(item.uid, item);
  }
  return [...byUid.values()];
}

/**
 * The first name an email greets someone by: one plain word of letters, or nothing (round 59). A display name is typed by
 * the person, so "https://evil.example" as a name went out as "Hi https://evil.example," from our address. "User" is
 * only the placeholder.
 */
export function safeFirstName(displayName: unknown): string {
  const first = String(displayName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first === "User" || first.length > 30) return "";
  return /^[\p{L}][\p{L}'-]*$/u.test(first) ? first : "";
}
