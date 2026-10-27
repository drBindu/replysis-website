import { MAYA_ADDON } from "../../data/mayaAddon";

/**
 * Whether a user has paid: any plan above free, except the 3 day Pro trial (planSource "trial"), which has paid nothing.
 */
export function isPaidPlan(user: { plan?: unknown; planSource?: unknown } | undefined | null): boolean {
  if (!user) return false;
  const plan = typeof user.plan === "string" ? user.plan.toLowerCase() : "free";
  return plan !== "free" && plan !== "" && user.planSource !== "trial";
}

export type MayaAccess = {
  /** "ok": may use the mock interview; "free": needs a paid plan first; "no_addon": paid, but without the add-on. */
  state: "ok" | "free" | "no_addon";
  /** Live Maya interviews a month. */
  monthly: number;
  /** True when the plan is an India plan paid once (the add-on is then bought once, for the same 30 days). */
  pass: boolean;
};

/**
 * Who gets the mock interview with Maya (owner, 2026-10-26): a paid plan plus the Maya add-on.
 * - `mayaAddon` is true while a subscription carries the add-on (kept in step by the Stripe webhook).
 * - `mayaAddonUntil` (ISO date) covers an India plan paid once, and the customers who were paying before the add-on
 *   existed: they keep Maya until their next renewal.
 * - Internal accounts (the owner and testers) always have it.
 */
export function mayaAccess(user: Record<string, unknown> | undefined | null, now = Date.now()): MayaAccess {
  const pass = user?.planSource === "pass";
  const monthly = typeof user?.mayaMonthly === "number" ? user.mayaMonthly : MAYA_ADDON.interviews;
  if (!user || !isPaidPlan(user)) return { state: "free", monthly, pass };
  const until = Date.parse(String(user.mayaAddonUntil ?? ""));
  const has = user.internal === true || user.mayaAddon === true || (Number.isFinite(until) && until > now);
  return { state: has ? "ok" : "no_addon", monthly, pass };
}
