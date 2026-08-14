"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { type PlanId, type UserProfile } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";
import { PageHeader } from "../../components/PageShell";
import { copyFor } from "../../components/feedback/messages";
import { PUBLIC_CREDIT_COSTS, PUBLIC_PLAN_CAPACITY } from "../../data/productFacts";

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

function Check({ color = "violet" }: { color?: "violet" | "emerald" | "orange" | "blue" | "gray" }) {
  const c = { violet: "text-zinc-800", emerald: "text-zinc-800", orange: "text-zinc-800", blue: "text-zinc-800", gray: "text-gray-300" }[color];
  return (
    <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${c}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function Dash() {
  return <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center text-gray-200 text-xs mt-0.5">-</span>;
}

// ─── PLAN DATA ────────────────────────────────────────────────────────────────
const ALL_PLANS: {
  id: PlanId;
  name: string;
  emoji: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  oneTime: boolean;
  cta: string;
  ctaNote: string;
  badge: string | null;
  popular: boolean;
  special: string | null;
  usagePool: string;
  features: string[];
  notIncluded: string[];
}[] = [
  {
    id: "free",
    name: "Starter",
    emoji: "🚀",
    tagline: "Explore Replysis before you upgrade.",
    monthlyPrice: 0,
    annualPrice: 0,
    oneTime: false,
    cta: "Start for free",
    ctaNote: "No credit card required",
    badge: null,
    popular: false,
    special: null,
    usagePool: PUBLIC_PLAN_CAPACITY.free.summary,
    features: [
      "Live AI answers with a sub-two-second response target",
      "Answers tailored to your resume and role",
      "Works on Zoom, Meet, Teams and phone calls",
      "Resume builder with free PDF download",
      "100 credits refresh automatically each month",
    ],
    notIncluded: [
      "Screen share exclusion (desktop app)",
      "AI resume rewrite for job postings",
      "Saved interview history",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "👑",
    tagline: "The complete toolkit for an active job search.",
    monthlyPrice: 29.99,
    // Annual is anchored to a clean yearly total ($299) and shown per month,
    // so the "billed" figure on the card matches the Stripe price exactly.
    annualPrice: 24.92,
    oneTime: false,
    cta: "Get Pro",
    ctaNote: "Cancel anytime",
    badge: "Most popular",
    popular: true,
    special: null,
    usagePool: PUBLIC_PLAN_CAPACITY.pro.summary,
    features: [
      "Best AI models for polished, natural answers",
      "Answers grounded in your resume, role and job description",
      "Up to 100 guided mock sessions with mock-only use",
      "Desktop capture exclusion for standard screen-share paths",
      "Saved interview history for review",
      "AI rewrites your resume for any job posting",
      "2,000 credits refresh automatically each month",
    ],
    notIncluded: [],
  },
  {
    id: "max",
    name: "Max",
    emoji: "👑",
    tagline: "Maximum access for interview-heavy weeks.",
    monthlyPrice: 49.99,
    annualPrice: 41.58,
    oneTime: false,
    cta: "Get Max",
    ctaNote: "Cancel anytime",
    badge: "Highest access",
    popular: false,
    special: null,
    usagePool: PUBLIC_PLAN_CAPACITY.max.summary,
    features: [
      "Everything in Pro, with 2.5× the monthly capacity",
      "Best AI models for polished, natural answers",
      "Answers grounded in your resume, role and job description",
      "Up to 250 guided mock sessions with mock-only use",
      "Desktop capture exclusion for standard screen-share paths",
      "Saved interview history for review",
      "AI resume tailoring for every role you target",
      "Priority support when you need help",
    ],
    notIncluded: [],
  },
];

// Everything below is derived from ALL_PLANS rather than hardcoded, so a price
// change in one place cannot leave a stale figure somewhere else on the page.
const PRO_PLAN = ALL_PLANS.find((p) => p.id === "pro")!;
const MAX_PLAN = ALL_PLANS.find((p) => p.id === "max")!;

const ANNUAL_SAVING_PCT = PRO_PLAN.monthlyPrice
  ? Math.round((1 - PRO_PLAN.annualPrice / PRO_PLAN.monthlyPrice) * 100)
  : 0;

const perMonth = (plan: typeof PRO_PLAN, annual: boolean) =>
  `$${(annual ? plan.annualPrice : plan.monthlyPrice).toFixed(2)}/mo`;

// ─── COMPARISON ROWS ──────────────────────────────────────────────────────────
const ROWS: { cat: string; label: string; free: boolean | string; pro: boolean | string; max: boolean | string }[] = [
  { cat: "Live Copilot",  label: "AI answers in real-time",              free: true,           pro: true,          max: true},
  { cat: "Live Copilot",  label: "Answer response target",               free: "Under 2 sec",  pro: "Under 2 sec", max: "Under 2 sec"},
  { cat: "Live Copilot",  label: "Monthly credits",                      free: "100",          pro: "2,000",        max: "5,000"},
  { cat: "Live Copilot",  label: "Zoom, Teams, Meet support",            free: true,           pro: true,          max: true},
  { cat: "Live Copilot",  label: "Desktop capture exclusion",            free: false,          pro: "Included",     max: "Included"},
  { cat: "Live Copilot",  label: "Camera practice mode",                 free: false,          pro: true,          max: true},
  { cat: "Mock Practice", label: "Mock interview sessions",              free: "6/month",      pro: "100/month",   max: "250/month"},
  { cat: "Mock Practice", label: "Questions tailored to role and JD",    free: true,           pro: true,          max: true},
  { cat: "Mock Practice", label: "Saved interview history",              free: false,          pro: true,          max: true},
  { cat: "Resume",        label: "Resume builder and PDF download",      free: true,           pro: true,          max: true},
  { cat: "Resume",        label: "Verify AI reads your resume",          free: true,           pro: true,          max: true},
  { cat: "Resume",        label: "AI rewrite for any job posting",       free: false,          pro: true,          max: true},
  { cat: "Apps",          label: "Web app, no install needed",           free: true,           pro: true,          max: true},
  { cat: "Apps",          label: "Windows desktop app",                  free: false,          pro: true,          max: true},
  { cat: "Apps",          label: "macOS desktop app",                    free: false,          pro: true,          max: true},
  { cat: "AI",            label: "AI model",                             free: "Standard",     pro: "Best",        max: "Best"},
  { cat: "Billing",       label: "Future features included",             free: false,          pro: true,          max: true},
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is the live copilot?",
    a: "During a session, Replysis transcribes audio, uses your resume as context, and streams a tailored answer suggestion to your screen. The desktop app includes operating-system capture controls for standard screen-share paths; always test your exact setup before an interview.",
  },
  {
    q: "How much can I actually use?",
    a: "Starter includes 100 credits per month, Pro includes 2,000, and Max includes 5,000. Live answers, mock practice, and AI resume tools share this balance. Credits refresh monthly and do not roll over. The cost is shown before a credit-using action."
  },
  {
    q: "Why do I need the desktop app for capture controls?",
    a: "Browsers cannot reliably exclude windows from screen share. The desktop app uses operating-system capture controls for standard capture paths. Coverage varies by operating system and capture tool; no software can guarantee exclusion in every proctoring or locked-down environment. Test your setup and follow the rules of your interview.",
  },
  {
    q: "What does AI resume tailoring do?",
    a: "You paste a job description and your resume. The AI rewrites your resume to match the exact keywords, skills, and language in that posting. The kind an ATS scans for before a human reads it. Available on Pro and Max.",
  },
  {
    q: "What is the difference between Pro and Max?",
    a: "Both plans include the same premium AI access, resume-grounded answers, desktop capture controls, saved interviews, and AI resume tailoring. Pro includes 2,000 monthly credits. Max includes 5,000 monthly credits (2.5x Pro) plus priority support. Max increases capacity, not answer accuracy.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Open Account & Billing and use the secure Stripe portal to cancel. You keep paid access through the end of the billing period and will not be charged for the next renewal.",
  },
  {
    q: "Is my data private?",
    a: "Live audio streams from your device to our speech-to-text provider and is not stored by Replysis. Transcripts and resume context are processed by Replysis and the selected AI provider to create responses. Saved session history stores interview content in your account until deletion. See the Privacy Policy and Trust Center for details.",
  },
  {
    q: "What if I want to stop paying?",
    a: "Email support@replysis.com from your account email before the next renewal. You keep access until the end of the period already paid for. If something goes wrong with a charge, include the account email and payment date so we can investigate."
  },
];

// ─── Table cell ───────────────────────────────────────────────────────────────
function Cell({ val, accent, orange }: { val: boolean | string; accent?: boolean; orange?: boolean }) {
  if (val === false) return <div className="flex justify-center"><Dash /></div>;
  if (val === true) return <div className="flex justify-center"><Check color={orange ? "orange" : accent ? "violet" : "emerald"} /></div>;
  const c = orange ? "text-zinc-900" : accent ? "text-zinc-900" : "text-gray-600";
  return <p className={`text-center text-xs font-medium ${c}`}>{val}</p>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="font-semibold text-gray-800 text-sm group-hover:text-zinc-900 transition-colors">{q}</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <p className="text-sm text-gray-500 leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Plan card styles by type ─────────────────────────────────────────────────
function getPlanStyle(plan: typeof ALL_PLANS[0]) {
  if (plan.popular) return {
    card:    { background: "linear-gradient(160deg, #ffffff 0%, #f5fbf6 58%, #eef8f0 100%)", border: "1.5px solid rgba(31,138,62,0.42)", boxShadow: "0 24px 70px rgba(22,72,39,0.14), 0 2px 8px rgba(22,72,39,0.06)" },
    stripe:  "linear-gradient(90deg, #1C7A3E, #2E8B45, #21924A)",
    badge:   { background: "linear-gradient(135deg, #1C7A3E, #21924A)" },
    btn:     { background: "linear-gradient(135deg, #1C7A3E, #2E8B45, #21924A)", boxShadow: "0 4px 20px rgba(31,138,62,0.35)" },
    pool:    { background: "rgba(31,138,62,0.08)", border: "1px solid rgba(31,138,62,0.15)", color: "#1C7A3E" },
    check:   "violet" as const,
  };
  return {
    card:    { background: plan.id === "max" ? "linear-gradient(160deg, #ffffff 0%, #fbfbf8 100%)" : "#ffffff", border: "1px solid rgba(24,35,28,0.11)", boxShadow: "0 16px 50px rgba(20,33,24,0.07), 0 2px 8px rgba(20,33,24,0.03)" },
    stripe:  "#e5e7eb",
    badge:   { background: "#374151" },
    btn:     { background: "#111827" },
    pool:    { background: "rgba(31,138,62,0.06)", border: "1px solid rgba(31,138,62,0.12)", color: "#1C7A3E" },
    check:   "emerald" as const,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<"pro" | "max" | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);
  const [annual,   setAnnual]   = useState(false);
  const [showAll,  setShowAll]  = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutReturn, setCheckoutReturn] = useState<"success" | "canceled" | null>(null);

  useEffect(() => {
    let stopProfile = () => undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      stopProfile();
      setUser(u);
      if (!u) {
        setProfile(null);
        return;
      }
      stopProfile = onSnapshot(doc(db, "users", u.uid), (snapshot) => {
        setProfile(snapshot.exists() ? ({ uid: u.uid, ...snapshot.data() } as UserProfile) : null);
      }, () => setProfile(null));
    });
    return () => { unsub(); stopProfile(); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setCheckoutReturn("success");
    else if (params.get("canceled") === "true") setCheckoutReturn("canceled");
  }, []);

  const handleCheckout = async (planId: "pro" | "max", checkoutUser: User | null = user) => {
    if (currentPlan && currentPlan !== "free") {
      setCheckoutError("You already have an active plan. Open Account & Billing to change it securely without creating a second subscription.");
      return;
    }
    if (!checkoutUser) {
      setPendingPlan(planId);
      setShowAuth(true);
      return;
    }
    setLoading(planId);
    setCheckoutError(null);
    try {
      const token = await checkoutUser.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ plan: planId, annual, uid: checkoutUser.uid, email: checkoutUser.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Never echo the server's own error text back to the buyer. The status
        // picks the wording, and the detail stays in the console.
        console.error("[Replysis] Checkout could not start:", res.status);
        setCheckoutError(
          res.status === 429
            ? copyFor("rateLimited").body
            : res.status === 409
              ? "You already have an active plan. Open Account & Billing to change it securely without creating a second subscription."
            : "We could not start checkout just now. You have not been charged. Please try again.",
        );
      }
    } catch (err) {
      console.error("[Replysis] Checkout request failed:", (err as Error)?.name ?? "Error");
      setCheckoutError(copyFor("offline").body);
    }
    setLoading(null);
  };

  const openFreeAccount = () => {
    setPendingPlan(null);
    setShowAuth(true);
  };

  const handleAuthSuccess = (signedInUser: User) => {
    setUser(signedInUser);
    setShowAuth(false);
    const planToBuy = pendingPlan;
    setPendingPlan(null);
    if (planToBuy) void handleCheckout(planToBuy, signedInUser);
    else window.location.href = "/real-interview";
  };

  const clearCheckoutReturn = () => {
    setCheckoutReturn(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("canceled");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const currentPlan = profile?.plan as PlanId | undefined;
  const hasPaidPlan = Boolean(currentPlan && currentPlan !== "free");
  const visibleRows = showAll ? ROWS : ROWS.slice(0, 10);

  return (
    <div className="marketing min-h-screen bg-[#FDFCFA] text-[#16150F]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showAuth && <AuthModal open={showAuth} initialMode="signup" onClose={() => { setShowAuth(false); setPendingPlan(null); }} onSuccess={handleAuthSuccess} />}
      <PageHeader />

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section className="relative px-5 sm:px-6 pt-8 md:pt-9 pb-7 md:pb-8 overflow-hidden border-b border-[#1f6f3d]/10"
        style={{ background: "linear-gradient(145deg, #ffffff 0%, #f7fbf7 52%, #f1f7f2 100%)" }}>
        <div className="absolute pointer-events-none -top-40 -left-24 w-[460px] h-[460px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(31,138,62,0.14) 0%, transparent 68%)", filter: "blur(70px)" }} />
        <div className="absolute pointer-events-none -top-48 right-0 w-[420px] h-[420px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(181,214,190,0.30) 0%, transparent 68%)", filter: "blur(70px)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(31,138,62,0.045) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(to bottom, black, transparent 90%)" }} />

        <div className="relative max-w-7xl mx-auto z-10 grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center gap-6 lg:gap-12">
          <div className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#1f6f3d]/20 shadow-sm backdrop-blur-sm mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1C7A3E] shadow-[0_0_0_4px_rgba(31,138,62,0.10)]" />
              <span className="text-[10px] font-bold text-[#32513c] tracking-[0.08em] uppercase">Simple plans. Serious interview advantage.</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62, delay: 0.04 }}
              className="text-[2.15rem] sm:text-4xl md:text-[2.8rem] font-black tracking-[-0.04em] leading-[1.03] text-[#121812] mb-3">
              The AI that gets you <span className="text-[#267b42]">the job.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }}
              className="text-gray-600 text-sm md:text-[0.96rem] leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Fast, resume-grounded answer suggestions with desktop controls designed for standard screen-share paths.
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-1.5 text-[11px] font-medium text-gray-500">
              {["Secure Stripe checkout", "Cancel anytime", "Clear monthly limits"].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e7f3e9] text-[#267b42]">✓</span>
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Billing toggle */}
          <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.15 }}
            className="rounded-2xl border border-[#1f6f3d]/15 bg-white/85 p-3.5 shadow-[0_16px_45px_rgba(27,67,39,0.10)] backdrop-blur-md">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">Billing period</p>
              <span className="rounded-full bg-[#e7f3e9] px-2.5 py-1 text-[10px] font-black text-[#267b42]">Save {ANNUAL_SAVING_PCT}% yearly</span>
            </div>
            <div className="grid grid-cols-2 items-center rounded-xl bg-[#eef2ed] p-1 gap-1">
              <button onClick={() => setAnnual(false)}
                className={`px-4 py-2.5 rounded-lg text-sm font-black transition-all ${!annual ? "bg-[#111711] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                Monthly
              </button>
              <button onClick={() => setAnnual(true)}
                className={`px-4 py-2.5 rounded-lg text-sm font-black transition-all ${annual ? "bg-[#267b42] text-white shadow-sm" : "text-[#267b42] hover:text-[#185b31]"}`}>
                Annual
              </button>
            </div>
            <p className="mt-2.5 px-1 text-center text-[11px] font-semibold text-gray-500">
              Annual: Pro {perMonth(PRO_PLAN, true)} · Max {perMonth(MAX_PLAN, true)}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ CHECKOUT ERROR BANNER ════════════════════════════════════════════════ */}
      {/* Return messages are verified against the live profile. A success
          query by itself never unlocks a paid plan. */}
      <AnimatePresence>
        {checkoutReturn && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`fixed top-4 left-1/2 z-[80] -translate-x-1/2 flex items-center gap-3 text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl max-w-lg w-[92vw] border ${
              checkoutReturn === "canceled"
                ? "bg-amber-50 text-amber-950 border-amber-200"
                : "bg-emerald-700 text-white border-emerald-600"
            }`}>
            <span className="flex-1">
              {checkoutReturn === "canceled"
                ? "Checkout canceled. You were not charged."
                : currentPlan === "pro" || currentPlan === "max"
                  ? `Your ${currentPlan === "pro" ? "Pro" : "Max"} plan is active. Your monthly credits are ready.`
                  : "We’re confirming your checkout and activating your plan. This usually takes only a few seconds."}
            </span>
            <button onClick={clearCheckoutReturn} aria-label="Dismiss checkout message" className="opacity-70 hover:opacity-100 transition-opacity ml-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 bg-red-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl max-w-md w-[90vw]">
            <span className="flex-1">{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} aria-label="Dismiss checkout error" className="text-white/70 hover:text-white transition-colors ml-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PLAN CARDS — all 4 side by side ════════════════════════════════════ */}
      <section className="relative px-5 sm:px-6 pt-6 pb-20"
        style={{ background: "linear-gradient(180deg, #f6f8f4 0%, #ffffff 28%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
            {ALL_PLANS.map((plan, i) => {
              const s = getPlanStyle(plan);
              const price = plan.oneTime ? plan.monthlyPrice : (annual ? plan.annualPrice : plan.monthlyPrice);
              const isCurrent = currentPlan === plan.id;
              const savings = !plan.oneTime && plan.monthlyPrice > 0
                ? Math.round((plan.monthlyPrice - plan.annualPrice) * 12)
                : 0;

              return (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative rounded-[22px] flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
                  style={s.card}>

                  {/* Top stripe */}
                  <div className="h-1 w-full" style={{ background: s.stripe }} />

                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-[0.08em] px-2.5 py-1 rounded-full text-white shadow-sm"
                      style={s.badge}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-5 lg:p-6 pb-4 lg:pb-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf5ee] text-base">{plan.emoji}</span>
                      <h2 className="text-lg font-black tracking-tight text-gray-900">{plan.name}</h2>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-3 mt-2 tracking-wide">{plan.tagline}</p>

                    {/* Price */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[2.25rem] leading-none font-black text-gray-950 tracking-[-0.04em]">
                          {price === 0 ? "Free" : `$${price}`}
                        </span>
                        {price > 0 && (
                          <span className="text-xs text-gray-400 font-medium">
                            {plan.oneTime ? " one-time" : " / mo"}
                          </span>
                        )}
                      </div>
                      {annual && savings > 0 && (
                        <p className="text-[11px] mt-0.5 font-semibold text-zinc-900">
                          ${Math.round(plan.annualPrice * 12)}/yr billed. Save ${savings}.
                        </p>
                      )}
                      {plan.oneTime && (
                        <p className="text-[11px] mt-0.5 font-semibold text-zinc-900">
                          Pays for itself in under 12 months.
                        </p>
                      )}
                      {price === 0 && <p className="text-[11px] text-gray-400 mt-0.5">No credit card needed</p>}
                    </div>

                    {/* Usage pill */}
                    <div className="rounded-xl px-3 py-2.5 mb-3" style={s.pool}>
                      <p className="text-[11px] font-black" style={{ color: s.pool.color }}>{plan.usagePool}</p>
                    </div>

                    {/* CTA */}
                    {plan.id === "free" ? (
                      <button onClick={() => !user && openFreeAccount()}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          isCurrent || user ? "bg-gray-100 text-gray-400 cursor-default" : "bg-gray-900 hover:bg-gray-700 text-white"
                        }`}>
                        {isCurrent ? "Current plan" : user ? "Starter features included" : plan.cta}
                      </button>
                    ) : (
                      hasPaidPlan ? (
                        <Link href="/account"
                          className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all hover:brightness-105"
                          style={s.btn}>
                          {isCurrent ? "Manage current plan" : "Change plan securely"}
                        </Link>
                      ) : (
                        <button onClick={() => handleCheckout(plan.id as "pro" | "max")}
                          disabled={!!loading}
                          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={s.btn}>
                          {loading === plan.id ? "Redirecting..." : plan.cta}
                        </button>
                      )
                    )}
                    <p className="text-center text-[10px] text-gray-400 mt-1.5">{plan.ctaNote}</p>
                  </div>

                  {/* Features */}
                  <div className="px-5 pb-5 border-t border-gray-100/80 pt-4 flex-1">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">What you get</p>
                    <ul className="space-y-2.5">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2">
                          <Check color={s.check} />
                          <span className="text-xs text-gray-700 leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.notIncluded.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <ul className="space-y-2">
                          {plan.notIncluded.map((t, ti) => (
                            <li key={ti} className="flex items-start gap-2 opacity-40">
                              <Dash />
                              <span className="text-xs text-gray-400">{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {!annual && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="text-center text-sm mt-6">
              <button onClick={() => setAnnual(true)}
                className="text-zinc-900 font-bold hover:text-zinc-950 underline underline-offset-2 transition-colors">
                Pay annually and save 2 months. Pro drops to {perMonth(PRO_PLAN, true)}. Max drops to {perMonth(MAX_PLAN, true)}.
              </button>
            </motion.p>
          )}

          <div className="mt-7 rounded-2xl border border-[#1f6f3d]/15 bg-white p-5 shadow-[0_12px_40px_rgba(20,60,34,0.06)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#267b42]">How credits work</p>
                <h3 className="mt-1 text-base font-black text-gray-900">One monthly balance across the product</h3>
              </div>
              <p className="text-xs text-gray-500">Mixed usage changes how many sessions you can run.</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PUBLIC_CREDIT_COSTS.map((item) => (
                <div key={item.action} className="rounded-xl bg-[#f5f8f5] px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-gray-600">{item.action}</p>
                  <p className="mt-1 text-sm font-black text-gray-900">{item.cost} {item.cost === 1 ? "credit" : "credits"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ REPLYSIS ADVANTAGE ════════════════════════════════════════════════ */}
      <section className="py-20 px-6 border-y border-[#1f6f3d]/10 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f1711 0%, #14261a 58%, #17351f 100%)" }}>
        <div className="max-w-6xl mx-auto relative">
          <div className="absolute pointer-events-none -top-52 right-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
          <FadeUp className="relative text-center mb-11">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200 mb-4">
              The Replysis advantage
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-[-0.035em]">One copilot. Your entire interview workflow.</h2>
            <p className="text-emerald-50/60 text-sm max-w-2xl mx-auto leading-relaxed">
              Paid plans include the complete premium experience. No separate upgrade for premium AI, desktop capture controls, mock practice, or resume tailoring.
            </p>
          </FadeUp>

          <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {[
              { number: "01", title: "Premium AI included", text: "Polished, natural answers grounded in your resume, role, and job description." },
              { number: "02", title: "Built for live pressure", text: "Answers stream as they generate, with a sub-two-second response target for live use." },
              { number: "03", title: "Desktop capture controls", text: "Designed to stay out of standard screen-share paths on supported desktop setups." },
              { number: "04", title: "Prepare and perform", text: "Tailor your resume, run mock sessions, get live help, and review interviews in one place." },
            ].map((item, i) => (
              <FadeUp key={item.number} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.08]">
                  <span className="text-[10px] font-black tracking-[0.15em] text-emerald-300/70">{item.number}</span>
                  <h3 className="mt-3 text-sm font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-50/55">{item.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.2}>
            <div className="relative grid md:grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-[24px] border border-emerald-200/15 bg-white text-[#121812] shadow-2xl">
              <div className="p-6 md:p-7">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#267b42]">Best for most people</p>
                    <h3 className="mt-1 text-xl font-black">Choose Pro</h3>
                  </div>
                  <span className="rounded-full bg-[#e8f4ea] px-3 py-1 text-xs font-black text-[#267b42]">{perMonth(PRO_PLAN, annual)}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">You are actively applying and interviewing, but do not run several sessions every day.</p>
                <button onClick={() => handleCheckout("pro")} className="mt-5 text-sm font-black text-[#267b42] hover:text-[#185b31]">Get Pro →</button>
              </div>

              <div className="hidden md:flex items-center justify-center bg-[#edf4ee] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#267b42] [writing-mode:vertical-rl] rotate-180">
                Choose in 10 seconds
              </div>

              <div className="border-t border-gray-100 p-6 md:border-l md:border-t-0 md:p-7">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Highest monthly capacity</p>
                    <h3 className="mt-1 text-xl font-black">Choose Max</h3>
                  </div>
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-black text-white">{perMonth(MAX_PLAN, annual)}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">You have frequent interview loops, practice daily, or need 2.5× Pro capacity and priority support.</p>
                <button onClick={() => handleCheckout("max")} className="mt-5 text-sm font-black text-gray-900 hover:text-[#267b42]">Get Max →</button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ WHY EACH PLAN ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Who each plan is built for</h2>
            <p className="text-gray-400 text-sm">Pick the one that matches where you are right now.</p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                emoji: "🚀", name: "Starter", color: "rgba(31,138,62,0.07)", border: "rgba(31,138,62,0.16)", tc: "#1C7A3E",
                who: "Testing the waters",
                items: ["Have interviews coming up soon", "Want to try it before committing", "Need a solid resume right now", "Casual job hunting, not urgent"],
              },
              {
                emoji: "👑", name: "Pro", color: "rgba(31,138,62,0.07)", border: "rgba(31,138,62,0.18)", tc: "#1C7A3E",
                who: "Serious job seekers",
                items: ["Actively interviewing every week", "Targeting competitive companies", "Want desktop capture controls", "Want saved history to review"],
              },
              {
                emoji: "👑", name: "Max", color: "rgba(31,138,62,0.07)", border: "rgba(31,138,62,0.16)", tc: "#21924A",
                who: "Interviewing constantly",
                items: ["Several interviews every week", "Long technical loops back to back", "Running mock sessions daily to prepare", "Need the highest monthly capacity"],
              },
            ].map((col, ci) => (
              <FadeUp key={ci} delay={ci * 0.08}>
                <div className="rounded-2xl p-6 h-full" style={{ background: col.color, border: `1px solid ${col.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{col.emoji}</span>
                    <p className="text-sm font-black text-gray-900">{col.name}</p>
                  </div>
                  <p className="text-[11px] font-semibold mb-4" style={{ color: col.tc }}>{col.who}</p>
                  <ul className="space-y-2.5">
                    {col.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2">
                        <Check color={ci === 0 ? "violet" : ci === 1 ? "violet" : ci === 2 ? "orange" : "blue"} />
                        <span className="text-xs text-gray-700 leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON TABLE ════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Full plan comparison</h2>
            <p className="text-gray-400 text-sm">Every feature, every plan, side by side.</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white overflow-x-auto">
              <div className="min-w-[660px]">
                <div className="grid grid-cols-4 bg-gray-50/80 border-b border-gray-200">
                  <div className="px-5 py-4" />
                  {[
                    { name: "Starter", price: "Free",                             style: "" },
                    { name: PRO_PLAN.name, price: perMonth(PRO_PLAN, annual), style: "bg-zinc-100/60 text-zinc-900" },
                    { name: MAX_PLAN.name, price: perMonth(MAX_PLAN, annual), style: "" },
                  ].map(({ name, price, style }, i) => (
                    <div key={i} className={`px-3 py-4 text-center border-l border-gray-200 ${style}`}>
                      <p className={`text-sm font-black ${style.includes("violet") ? "text-zinc-900" : style.includes("orange") ? "text-zinc-900" : "text-gray-900"}`}>{name}</p>
                      <p className={`text-[11px] mt-0.5 font-medium ${style.includes("violet") ? "text-zinc-600" : style.includes("orange") ? "text-zinc-600" : "text-gray-400"}`}>{price}</p>
                    </div>
                  ))}
                </div>

                {(() => {
                  let lastCat = "";
                  return visibleRows.map((row, i) => {
                    const showCat = row.cat !== lastCat;
                    lastCat = row.cat;
                    return (
                      <div key={i}>
                        {showCat && (
                          <div className="grid grid-cols-4 bg-gray-50/40 border-b border-gray-100">
                            <div className="px-5 py-2 col-span-4">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.cat}</span>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                          <div className="px-5 py-3.5"><span className="text-xs text-gray-600">{row.label}</span></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 flex items-center justify-center"><Cell val={row.free} /></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 bg-zinc-100/10 flex items-center justify-center"><Cell val={row.pro} accent /></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 flex items-center justify-center"><Cell val={row.max} /></div>
                        </div>
                      </div>
                    );
                  });
                })()}

                <div className="border-t border-gray-100">
                  <button onClick={() => setShowAll(!showAll)}
                    className="w-full py-4 text-sm font-semibold text-zinc-900 hover:text-zinc-950 hover:bg-zinc-100/30 transition-colors flex items-center justify-center gap-2">
                    {showAll ? "Show less" : `Show all ${ROWS.length} features`}
                    <motion.svg animate={{ rotate: showAll ? 180 : 0 }} transition={{ duration: 0.2 }}
                      className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>


      {/* ══ FAQ ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Questions</h2>
            <p className="text-gray-400 text-sm">Everything you need before signing up.</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="bg-white rounded-2xl border border-gray-200 px-8 shadow-sm">
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
            <p className="text-center text-sm text-gray-400 mt-6">
              Still have questions?{" "}
              <a href="mailto:support@replysis.com" className="text-zinc-900 font-semibold hover:underline">Email us</a>
              {" "}and we reply same day.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #ffffff 0%, #fafafa 40%, #fafafa 75%, #ffffff 100%)" }}>
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(31,138,62,0.09) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(31,138,62,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-xl mx-auto z-10">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight leading-tight">
              Your next interview is<br />
              <span style={{ background: "linear-gradient(135deg, #1C7A3E 0%, #2E8B45 45%, #21924A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                your best interview.
              </span>
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              Start free today. No card needed. See it work in your next real interview, then decide.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => user ? window.location.href = "/real-interview" : openFreeAccount()}
                className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #1C7A3E, #2E8B45, #21924A)", boxShadow: "0 6px 24px rgba(31,138,62,0.3)" }}>
                {user ? "Go to dashboard →" : "Start for free"}
              </button>
              <Link href="/real-interview"
                className="px-8 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-zinc-400 text-gray-700 hover:text-zinc-900 font-semibold text-sm transition-all">
                Try live copilot now
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-[11px] text-gray-400">
              {["Fast streaming", "Raw audio not stored", "Major platform support", "Free to start"].map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  {s}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

    </div>
  );
}
