"use client";

import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { isReferralCode } from "../data/referrals";

const KEY = "replysis_ref";

/**
 * Remembers a friend's code from ?ref=CODE, and once the visitor has an account, claims it. Nothing is shown; the server
 * decides whether the account is new enough and whether the code is real. Storage can be blocked: every access is guarded.
 */
export default function ReferralCapture() {
  const { user } = useAuth();

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref")?.toUpperCase();
      if (isReferralCode(code)) window.localStorage.setItem(KEY, code);
    } catch { /* private window or blocked storage */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    let code: string | null = null;
    try { code = window.localStorage.getItem(KEY); } catch { return; }
    if (!isReferralCode(code)) return;
    let cancelled = false;
    (async () => {
      try {
        // A brand new account's profile is written a moment after sign in; wait for it before claiming.
        await new Promise((r) => setTimeout(r, 4000));
        if (cancelled) return;
        const token = await user.getIdToken();
        const res = await fetch("/api/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        // Settled either way (rewarded, already claimed, too old, own code): do not ask again.
        if (res.ok && data.reason !== "no-profile") window.localStorage.removeItem(KEY);
      } catch { /* tried again on the next visit */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return null;
}
