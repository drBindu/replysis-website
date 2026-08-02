"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../app/firebaseConfig";
import { CREDIT_COSTS } from "../app/lib/credits";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const PLAN_MAX: Record<string, number> = {
  free:     100,
  pro:      5000,
  lifetime: 5000,
  teams:    10000,
};

type PlanKey = "free" | "pro" | "lifetime" | "teams";

const PLAN_META: Record<PlanKey, {
  label: string;
  pillClass: string;
  pillStyle?: React.CSSProperties;
  icon: React.ReactNode;
  dropdownAccent: string;
  barColor: string;
}> = {
  free: {
    label: "Starter",
    pillClass: "border border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/60 shadow-sm",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    dropdownAccent: "#7c3aed",
    barColor: "linear-gradient(90deg, #7c3aed, #a855f7)",
  },
  pro: {
    label: "Pro",
    pillClass: "text-white border-transparent shadow-md",
    pillStyle: { background: "linear-gradient(135deg, #5b21b6, #ea580c)", boxShadow: "0 2px 10px rgba(91,33,182,0.32)" },
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    dropdownAccent: "#6d28d9",
    barColor: "linear-gradient(90deg, #6d28d9, #ea580c)",
  },
  lifetime: {
    label: "Lifetime",
    pillClass: "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    dropdownAccent: "#d97706",
    barColor: "linear-gradient(90deg, #d97706, #f59e0b)",
  },
  teams: {
    label: "Teams",
    pillClass: "border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 shadow-sm",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    dropdownAccent: "#0891b2",
    barColor: "linear-gradient(90deg, #0891b2, #06b6d4)",
  },
};

function CreditArc({ pct, color }: { pct: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none"
        stroke="url(#arcGrad)" strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)" />
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function CreditsBadge() {
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan]       = useState<PlanKey>("free");
  const [uid, setUid]         = useState<string | null>(null);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);
  const router                = useRouter();

  useEffect(() => {
    const u = onAuthStateChanged(auth, (user) => setUid(user?.uid || null));
    return () => u();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const u = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setCredits(d.credits ?? 0);
        setPlan((d.plan || "free") as PlanKey);
      }
    });
    return () => u();
  }, [uid]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!uid || credits === null) return null;

  const meta           = PLAN_META[plan] ?? PLAN_META.free;
  const max            = PLAN_MAX[plan] ?? 100;
  const displayCredits = Math.min(credits, max);
  const pct            = Math.max(0, Math.min(100, Math.round((displayCredits / max) * 100)));
  const isLow          = plan === "free" && credits < 20;
  const isCrit         = plan === "free" && credits < 5;
  const isPaid         = plan !== "free";

  const barColor  = isCrit ? "#ef4444" : isLow ? "#f59e0b" : meta.dropdownAccent;

  return (
    <div className="relative" ref={ref}>
      {/* ── Pill badge ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-150 ${meta.pillClass} ${isCrit ? "animate-pulse" : ""}`}
        style={meta.pillStyle}
        title="View your credits and plan">
        <span className={isCrit ? "text-red-500" : isLow ? "text-amber-500" : ""}>{meta.icon}</span>
        {isPaid ? (
          <span>{meta.label}</span>
        ) : (
          <span className={isCrit ? "text-red-600" : isLow ? "text-amber-600" : ""}>
            {credits.toLocaleString()} credits
          </span>
        )}
        <svg className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""} ${isPaid ? "opacity-70" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden bg-white z-[200]"
            style={{ border: "1px solid rgba(124,58,237,0.10)", boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(124,58,237,0.09)" }}>

            {/* Header bar */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-black text-gray-900">
                    {isPaid ? `${meta.label} Plan` : "Starter Plan"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {max.toLocaleString()} credits per month
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{ background: isPaid ? "linear-gradient(135deg,#5b21b6,#ea580c)" : "rgba(124,58,237,0.08)", color: isPaid ? "white" : "#6d28d9" }}>
                  {meta.label}
                </span>
              </div>
            </div>

            {/* Credit usage */}
            <div className="px-5 py-5">
              <div className="flex items-center gap-4 mb-4">
                {/* Arc ring */}
                <div className="relative flex-shrink-0">
                  <CreditArc pct={pct} color={barColor} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-black text-gray-800">{pct}%</span>
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-black text-gray-900">{displayCredits.toLocaleString()}</span>
                    <span className="text-[12px] text-gray-400 font-medium">/ {max.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">credits remaining this month</p>
                  {isCrit && (
                    <p className="text-[11px] font-bold text-red-500 mt-1">Almost out. Upgrade to keep going.</p>
                  )}
                  {isLow && !isCrit && (
                    <p className="text-[11px] font-bold text-amber-500 mt-1">Running low. Upgrade for more.</p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: isCrit ? "#ef4444" : isLow ? "linear-gradient(90deg,#f59e0b,#ef4444)" : meta.barColor }} />
              </div>

              {/* Credit cost hints — pulled from CREDIT_COSTS so they never go stale */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Live interview / min", cost: CREDIT_COSTS.realtime_per_minute },
                  { label: "Mock session",          cost: CREDIT_COSTS.mock_interview_session },
                ].map((h, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 mb-0.5">{h.label}</p>
                    <p className="text-[11px] font-bold text-gray-700">{h.cost} credits</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA row */}
            <div className="px-5 pb-4">
              {!isPaid ? (
                <button
                  onClick={() => { router.push("/pricing"); setOpen(false); }}
                  className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98] relative overflow-hidden group"
                  style={{ background: "linear-gradient(135deg, #5b21b6, #ea580c)", boxShadow: "0 3px 12px rgba(91,33,182,0.32)" }}>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)" }} />
                  Upgrade for 50x more credits
                  <span className="ml-1.5 opacity-80">→</span>
                </button>
              ) : (
                <button
                  onClick={() => { router.push("/pricing"); setOpen(false); }}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/60 transition-all">
                  Manage plan
                </button>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
