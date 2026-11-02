import { MAYA_ADDON, MAX_INCLUDES_MAYA, MOCK_PLAN } from "../../data/mayaAddon";
import { PLAN_MONTHLY_CREDITS } from "../../data/productFacts";

/**
 * Whether a user has paid: any plan above free, except the 1 day Pro trial (planSource "trial"), which has paid nothing.
 */
export function isPaidPlan(user: { plan?: unknown; planSource?: unknown } | undefined | null): boolean {
  if (!user) return false;
  const plan = typeof user.plan === "string" ? user.plan.toLowerCase() : "free";
  return plan !== "free" && plan !== "" && user.planSource !== "trial";
}

/** Whether the Practice plan runs: its subscription, or an India month paid once that has not ended. */
export function practiceActive(user: Record<string, unknown> | undefined | null, now = Date.now()): boolean {
  const until = Date.parse(String(user?.mockPlanUntil ?? ""));
  return user?.mockPlan === true || (Number.isFinite(until) && until > now);
}

/**
 * The month's own answers before packs start being spent. A Practice account stays on plan "free", whose 25 credits would
 * count everything after the first five answers as pack spending. Same rule as the Java FirestoreCreditsService.chargeCap.
 */
export function chargeCap(user: Record<string, unknown>, now = Date.now()): number {
  const plan = typeof user.plan === "string" && user.plan in PLAN_MONTHLY_CREDITS ? user.plan : "free";
  if (plan === "free" && practiceActive(user, now)) {
    return user.audioMinutesAllowance === MOCK_PLAN.audioMinutesIndia ? MOCK_PLAN.creditsIndia : MOCK_PLAN.credits;
  }
  return PLAN_MONTHLY_CREDITS[plan as keyof typeof PLAN_MONTHLY_CREDITS];
}

export type MayaAccess = {
  /**
   * "ok": may use the mock interview; "taste": the one free interview every account gets (3 questions);
   * "free": needs the Mock interview plan or a paid plan first; "no_addon": paid, but without the add-on.
   */
  state: "ok" | "taste" | "free" | "no_addon";
  /** Hidden fair use: live Maya interviews a month. */
  monthly: number;
  /** True when the plan is an India plan paid once (the add-on is then bought once, for the same 30 days). */
  pass: boolean;
};

/**
 * Who gets the mock interview with Maya (owner, 2026-10-26):
 * - the Mock interview plan on its own: `mockPlan` while its subscription runs, or `mockPlanUntil` for an India month
 *   paid once;
 * - a paid plan plus the Maya add-on: `mayaAddon` while the subscription carries it, or `mayaAddonUntil` (an India
 *   month paid once, and customers who were paying before the add-on existed, until their next renewal);
 * - internal accounts (the owner and testers) always.
 * Everyone else gets one free interview first.
 */
export function mayaAccess(user: Record<string, unknown> | undefined | null, now = Date.now()): MayaAccess {
  const pass = user?.planSource === "pass";
  const monthly = typeof user?.mayaMonthly === "number" ? user.mayaMonthly : MAYA_ADDON.interviews;
  const future = (v: unknown) => { const t = Date.parse(String(v ?? "")); return Number.isFinite(t) && t > now; };
  const mockPlan = !!user && (user.mockPlan === true || future(user.mockPlanUntil));
  const addon = !!user && isPaidPlan(user)
    && (user.internal === true || user.mayaAddon === true || future(user.mayaAddonUntil));
  // Max includes Maya (2026-10-27): the add-on's numbers, half in India (a rupee month paid once, or a rupee allowance).
  const max = !!user && MAX_INCLUDES_MAYA && isPaidPlan(user) && String(user.plan).toLowerCase() === "max";
  if (max && !addon && !mockPlan) {
    const india = pass || typeof user?.audioMinutesAllowance === "number";
    return { state: "ok", monthly: india ? MAYA_ADDON.interviewsIndia : MAYA_ADDON.interviews, pass };
  }
  if (mockPlan || addon) return { state: "ok", monthly, pass };
  if (user && user.mayaFreeUsed !== true) return { state: "taste", monthly, pass };
  return { state: user && isPaidPlan(user) ? "no_addon" : "free", monthly, pass };
}

/**
 * Whether Maya's side of a mock interview (her replies, her voice, the suggested answer) may run. It costs no answers, so
 * without this an account with nothing left could use it for ever. Practice on the phone needs it for anyone with an
 * interview to take: their free one, Maya on their plan, or answers left to pay for the questions and feedback.
 */
export function mockConversationAllowed(user: Record<string, unknown>, now = Date.now()): boolean {
  return user.internal === true || mockStepsFree(user, now) || Number(user.credits ?? 0) >= 5 || Number(user.minutesBalance ?? 0) > 0;
}

/**
 * Whether the mock interview's own steps (questions, feedback) are free for this user: with Practice or the add-on they
 * use no answers, and the one free interview is free too (for half an hour after it starts).
 */
export function mockStepsFree(user: Record<string, unknown> | undefined | null, now = Date.now()): boolean {
  const access = mayaAccess(user, now);
  if (access.state === "ok" || access.state === "taste") return true;
  const at = user?.mayaFreeUsedAt as { toMillis?: () => number } | undefined;
  return typeof at?.toMillis === "function" && now - at.toMillis() < 30 * 60_000;
}
