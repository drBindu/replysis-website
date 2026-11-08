/**
 * When the month's reset date has passed but nothing has moved it yet (only an answer moves it), the counter is zeroed once
 * for that date and then counts up again. Zeroing it on every report (bug round 50) let someone who only listens, and never
 * asks for an answer, keep the counter at one report's minutes indefinitely. Returns the reset date to record when the
 * counter must be zeroed now, otherwise null. The same rule as the backend's FirestoreCreditsService.listeningPeriod.
 */
export function listeningPeriod(resetAt: number, storedPeriod: unknown, now: number): number | null {
  if (!resetAt || !Number.isFinite(resetAt) || now < resetAt) return null;
  if (typeof storedPeriod === "number" && storedPeriod === resetAt) return null;
  return resetAt;
}
