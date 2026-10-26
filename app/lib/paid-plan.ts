/**
 * Whether a user has paid: any plan above free, except the 3 day Pro trial (planSource "trial"), which has paid nothing.
 * The mock interview with live Maya is for paid users only (owner, 2026-10-26).
 */
export function isPaidPlan(user: { plan?: unknown; planSource?: unknown } | undefined | null): boolean {
  if (!user) return false;
  const plan = typeof user.plan === "string" ? user.plan.toLowerCase() : "free";
  return plan !== "free" && plan !== "" && user.planSource !== "trial";
}
