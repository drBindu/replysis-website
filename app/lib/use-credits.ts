// frontend/app/lib/useCredits.ts
// ═══════════════════════════════════════════════════════════════
// React hook for credit checking on frontend pages
// Usage: const { checkAndDeduct, credits, plan, showPaywall } = useCredits();
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { CREDIT_COSTS, type CreditAction, type PlanId } from "./credits";

const PLAN_MONTHLY_AUDIO_MINUTES: Record<string, number> = {
  free:       60,
  pro:       900,
  max:      1800,
  lifetime: 1800,
  teams:    6000,
};

export function useCredits() {
  const [uid, setUid] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [plan, setPlan] = useState<PlanId>("free");
  const [loading, setLoading] = useState(true);

  // Listening time, the second limit. Credits meter questions and the
  // microphone bills by the hour, so either can stop an interview. Showing
  // only the credits is how a support ticket starts: somebody with two
  // thousand credits on screen and no listening time left reads a healthy
  // number and a dead microphone, and concludes the product is broken.
  const [audioMinutesUsed, setAudioMinutesUsed] = useState<number>(0);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallAction, setPaywallAction] = useState("");
  const [paywallCost, setPaywallCost] = useState(0);

  // Server-rejection error: client thought the user could afford it, but the
  // server-side deduction failed (race condition, credit already spent, etc.)
  const [serverError, setServerError] = useState<string | null>(null);

  // Listen to auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      if (!user) {
        setCredits(0);
        setPlan("free");
        setAudioMinutesUsed(0);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Listen to Firestore user doc (real-time credits updates)
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCredits(data.credits || 0);
        setPlan((data.plan as PlanId) || "free");
        setAudioMinutesUsed(Math.max(0, Number(data.audioMinutesUsed ?? 0)));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // Check if user can afford action  -  returns true/false
  // If false, opens paywall modal
  const canAfford = useCallback((action: CreditAction): boolean => {
    const cost = CREDIT_COSTS[action];

    // No longer used (sentinel removed — all plans now have finite credit caps)

    if (credits < cost) {
      setPaywallAction(action.replace(/_/g, " "));
      setPaywallCost(cost);
      setShowPaywall(true);
      return false;
    }
    return true;
  }, [credits]);

  // Server-side deduction  -  call your API route which deducts in Firestore
  const deductOnServer = useCallback(async (action: CreditAction): Promise<boolean> => {
    if (!uid) return false;
    try {
      let authToken = "";
      try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
      const res = await fetch("/api/credits/deduct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ uid, action }),
      });
      const data = await res.json();
      return data.success || false;
    } catch {
      return false;
    }
  }, [uid]);

  // Combined: check + deduct (use this before AI calls).
  // Returns true only when both the local check AND the server deduction succeed.
  // If the server rejects after the local check passed (e.g. race condition),
  // `serverError` is set so callers can surface an error to the user.
  const checkAndDeduct = useCallback(async (action: CreditAction): Promise<boolean> => {
    if (!canAfford(action)) return false;
    setServerError(null);
    const ok = await deductOnServer(action);
    if (!ok) {
      setServerError("Could not deduct credits  -  please refresh and try again.");
    }
    return ok;
  }, [canAfford, deductOnServer]);

  // Must match PLAN_MONTHLY_AUDIO_MINUTES in the STT token route and in the
  // Java backend's FirestoreCreditsService. All three read and write the same
  // audioMinutesUsed field, so a user of the website and the desktop apps has
  // one allowance rather than three that each look generous alone.
  const audioAllowance = PLAN_MONTHLY_AUDIO_MINUTES[plan] ?? PLAN_MONTHLY_AUDIO_MINUTES.free;
  const audioMinutesLeft = Math.max(0, audioAllowance - audioMinutesUsed);

  return {
    uid,
    credits,
    audioMinutesLeft,
    audioMinutesUsed,
    audioAllowance,
    plan,
    loading,
    canAfford,
    checkAndDeduct,
    showPaywall,
    setShowPaywall,
    paywallAction,
    paywallCost,
    serverError,
    setServerError,
    isUnlimited: false,
  };
}
