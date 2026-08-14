"use client";

import { AnimatePresence, motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../app/firebaseConfig";
import { useAuth } from "./AuthProvider";

type Notice = {
  credits: number;
  tier: "low" | "empty";
};

function cycleKey(value: unknown): string {
  if (typeof value === "string" && value) return value.slice(0, 10);
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") return toDate().toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 7);
}

export default function CreditUpgradeNotice() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setNotice(null);
    if (!user || pathname === "/pricing" || pathname.startsWith("/admin")) return;

    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const plan = typeof data.plan === "string" ? data.plan : "free";
      const credits = Math.max(0, Number(data.credits ?? 0));

      if (plan !== "free" || credits > 20) {
        setNotice(null);
        return;
      }

      const tier: Notice["tier"] = credits === 0 ? "empty" : "low";
      const storageKey = `replysis-credit-warning:${user.uid}:${cycleKey(data.creditsResetDate)}:${tier}`;
      if (localStorage.getItem(storageKey)) return;

      // Each warning is shown once per credit cycle. Reaching zero is a new,
      // stronger tier, so it still appears even if the low-credit warning was
      // already dismissed earlier in the month.
      localStorage.setItem(storageKey, "shown");
      setNotice({ credits, tier });
    }, () => {
      // A warning is optional UI. If Firestore is temporarily unavailable,
      // credit enforcement remains server-side and the page keeps working.
      setNotice(null);
    });
  }, [pathname, user]);

  const empty = notice?.tier === "empty";

  return (
    <AnimatePresence>
      {notice && (
        <motion.aside
          role="dialog"
          aria-live="polite"
          aria-label={empty ? "Free credits used" : "Free credits running low"}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed bottom-5 right-5 z-[500] w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
        >
          <div className={`h-1 ${empty ? "bg-red-500" : "bg-amber-400"}`} />
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${empty ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-black text-slate-900">
                  {empty ? "Your free credits are used" : "Your free credits are running low"}
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">
                  {empty
                    ? "Upgrade to Pro to keep using Replysis without waiting for your next free credit refill."
                    : `You have ${notice.credits} free credits remaining. Upgrade now to avoid an interruption.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss upgrade reminder"
                className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  router.push("/pricing");
                }}
                className="flex-1 rounded-xl bg-[#1C7A3E] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#176533] active:scale-[0.98]"
              >
                Upgrade to Pro
              </button>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Later
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
