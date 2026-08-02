// frontend/app/lib/credits.ts
// ═══════════════════════════════════════════════════════════════
// CREDIT SYSTEM  -  Single source of truth for all usage tracking
// Reads/writes Firestore. Used by API routes + frontend pages.
// ═══════════════════════════════════════════════════════════════

import { doc, getDoc, updateDoc, setDoc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ── CREDIT COSTS PER ACTION ──
export const CREDIT_COSTS = {
  resume_analysis: 10,
  resume_tailor: 20,
  mock_interview_session: 15,
  mock_feedback: 5,
  mock_script: 5,
  realtime_per_minute: 2,
  question_generation: 5,
  verify_resume: 0, // free
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ── PLAN LIMITS ──
export const PLAN_CONFIG = {
  free: {
    label: "Free",
    totalCredits: 100,
    monthlyReset: true,
    allowedModels: ["llama-3.1-8b-instant"],
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
    totalCredits: 5000, // 5000/month ≈ 40 hrs live or 300+ mock sessions
    monthlyReset: true,
    price: 24.99,
    stripePriceId: "",
    allowedModels: ["llama-3.1-8b-instant", "gpt-4o-mini", "gpt-4.1"],
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
    totalCredits: 5000, // 5000/month — pay once, refills monthly forever
    monthlyReset: true,
    price: 299,
    stripePriceId: "",
    allowedModels: ["llama-3.1-8b-instant", "gpt-4o-mini", "gpt-4.1"],
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
    totalCredits: 10000, // 10000/month ≈ 83 hrs live or 650+ mock sessions
    monthlyReset: true,
    price: 49,
    stripePriceId: "",
    allowedModels: ["llama-3.1-8b-instant", "gpt-4o-mini", "gpt-4.1"],
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

export type PlanId = keyof typeof PLAN_CONFIG;

// ── USER PROFILE TYPE ──
export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  plan: PlanId;
  credits: number;
  creditsUsed: number;
  creditsResetDate: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: any;
  lastLogin: any;
};

// ═══════════════════════════════════════════════════════════════
// GET USER PROFILE  -  returns plan + credits
// ═══════════════════════════════════════════════════════════════
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZE USER  -  called on signup/first login
// ═══════════════════════════════════════════════════════════════
export async function initializeUserCredits(uid: string, email: string, displayName: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Brand new user  -  give free credits
    await setDoc(ref, {
      uid,
      email,
      displayName: displayName || "User",
      plan: "free",
      credits: PLAN_CONFIG.free.totalCredits,
      creditsUsed: 0,
      creditsResetDate: getNextResetDate(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt:  serverTimestamp(),
      lastLogin:  serverTimestamp(),
    });
  } else {
    // Existing user  -  just update last login
    await updateDoc(ref, { lastLogin: serverTimestamp() });
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK CREDITS  -  returns true if user can afford the action
// ═══════════════════════════════════════════════════════════════
export async function hasCredits(uid: string, action: CreditAction): Promise<boolean> {
  const profile = await getUserProfile(uid);
  if (!profile) return false;

  const cost = CREDIT_COSTS[action];
  return profile.credits >= cost;
}

// ═══════════════════════════════════════════════════════════════
// DEDUCT CREDITS  -  atomic transaction to prevent race conditions
// ═══════════════════════════════════════════════════════════════
export async function deductCredits(uid: string, action: CreditAction): Promise<{ success: boolean; remaining: number }> {
  const ref  = doc(db, "users", uid);
  const cost = CREDIT_COSTS[action];

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return { success: false, remaining: 0 };

      const data    = snap.data();
      const planKey = (data.plan as PlanId) in PLAN_CONFIG ? (data.plan as PlanId) : "free";
      const plan    = PLAN_CONFIG[planKey];
      let   credits = (data.credits as number) || 0;

      // Lazy monthly reset: once the reset date passes, refill to the plan
      // cap before charging. Without this a capped user who hit 0 is stuck.
      const resetAt = data.creditsResetDate ? Date.parse(data.creditsResetDate) : 0;
      let didReset = false;
      if (resetAt && Date.now() >= resetAt) {
        credits  = plan.totalCredits;
        didReset = true;
      }

      // Check balance inside the transaction  -  prevents TOCTOU race
      if (credits < cost) {
        if (didReset) transaction.update(ref, { credits, creditsUsed: 0, creditsResetDate: getNextResetDate() });
        return { success: false, remaining: credits };
      }

      if (didReset) {
        transaction.update(ref, {
          credits:          credits - cost,
          creditsUsed:      cost,
          creditsResetDate: getNextResetDate(),
        });
      } else {
        transaction.update(ref, {
          credits:     increment(-cost),
          creditsUsed: increment(cost),
        });
      }

      return { success: true, remaining: credits - cost };
    });
  } catch {
    return { success: false, remaining: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// UPGRADE PLAN  -  called by Stripe webhook
// ═══════════════════════════════════════════════════════════════
export async function upgradePlan(
  uid: string,
  plan: PlanId,
  stripeCustomerId: string,
  stripeSubscriptionId: string
) {
  const planConfig = PLAN_CONFIG[plan];
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    plan,
    credits: planConfig.totalCredits, // monthly cap; refills via lazy reset
    creditsUsed: 0,
    creditsResetDate: getNextResetDate(),
    stripeCustomerId,
    stripeSubscriptionId,
  });
}

// ═══════════════════════════════════════════════════════════════
// CANCEL PLAN  -  revert to free
// ═══════════════════════════════════════════════════════════════
export async function cancelPlan(uid: string) {
  await updateDoc(doc(db, "users", uid), {
    plan: "free",
    credits: PLAN_CONFIG.free.totalCredits,
    creditsResetDate: getNextResetDate(),
    stripeSubscriptionId: null,
  });
}

// ── HELPER ──
function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}