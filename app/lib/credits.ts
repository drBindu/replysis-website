// frontend/app/lib/credits.ts
// ═══════════════════════════════════════════════════════════════
// CREDIT SYSTEM  -  Single source of truth for all usage tracking
// Costs, plan limits and the profile type, shared by pages. It writes nothing: the server owns every
// balance and plan change, and the database rules refuse them from a browser.
// ═══════════════════════════════════════════════════════════════

import { CREDIT_ACTION_COSTS, PLAN_MONTHLY_CREDITS, type PlanId } from "../../data/productFacts";

// ── CREDIT COSTS PER ACTION ──
export const CREDIT_COSTS = CREDIT_ACTION_COSTS;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ── PLAN LIMITS ──
export const PLAN_CONFIG = {
  free: {
    label: "Free",
    totalCredits: PLAN_MONTHLY_CREDITS.free,
    monthlyReset: true,
    allowedModels: ["openai/gpt-oss-20b"],
    features: {
      resumeBuilder: true,
      aiTailor: false,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: false,
      cameraMode: false,
      sessionRecordings: false,
    },
  },
  pro: {
    label: "Pro",
    totalCredits: PLAN_MONTHLY_CREDITS.pro,
    monthlyReset: true,
    price: 34.99,
    stripePriceId: "",
    allowedModels: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "gpt-4o-mini", "gpt-4.1"],
    features: {
      resumeBuilder: true,
      aiTailor: true,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: true,
      cameraMode: true,
      sessionRecordings: true,
    },
  },
  max: {
    label: "Max",
    totalCredits: PLAN_MONTHLY_CREDITS.max,
    monthlyReset: true,
    price: 79.99,
    stripePriceId: "",
    allowedModels: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "gpt-4o-mini", "gpt-4.1"],
    features: {
      resumeBuilder: true,
      aiTailor: true,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: true,
      cameraMode: true,
      sessionRecordings: true,
    },
  },
  lifetime: {
    label: "Lifetime",
    totalCredits: PLAN_MONTHLY_CREDITS.lifetime,
    monthlyReset: true,
    price: 299,
    stripePriceId: "",
    allowedModels: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "gpt-4o-mini", "gpt-4.1"],
    features: {
      resumeBuilder: true,
      aiTailor: true,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: true,
      cameraMode: true,
      sessionRecordings: true,
    },
  },
  teams: {
    label: "Teams",
    totalCredits: PLAN_MONTHLY_CREDITS.teams,
    monthlyReset: true,
    price: 49,
    stripePriceId: "",
    allowedModels: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "gpt-4o-mini", "gpt-4.1"],
    features: {
      resumeBuilder: true,
      aiTailor: true,
      mockInterview: true,
      realTimeInterview: true,
      desktopApp: true,
      cameraMode: true,
      sessionRecordings: true,
    },
  },
} as const;

export type { PlanId };

// ── USER PROFILE TYPE ──
export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  plan: PlanId;
  credits: number;
  creditsUsed: number;
  purchasedCredits?: number;
  creditsResetDate: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeCancelAtPeriodEnd?: boolean;
  stripeCurrentPeriodEnd?: number | null;
  stripeBillingInterval?: "monthly" | "annual" | null;
  /** "pass" for an India month paid once (passExpiresAt is its end), "subscription" for AutoPay. */
  planSource?: string;
  passExpiresAt?: string;
  lastPaymentFailedAt?: string | null;
  onboardingSeenAt?: unknown;
  createdAt: any;
  lastLogin: any;
};
