"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getUserProfile, type PlanId } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";
import { PageHeader } from "../../components/PageShell";

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
  const c = { violet: "text-violet-500", emerald: "text-emerald-500", orange: "text-orange-500", blue: "text-blue-500", gray: "text-gray-300" }[color];
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
  special: "lifetime" | "teams" | null;
  usagePool: string;
  features: string[];
  notIncluded: string[];
}[] = [
  {
    id: "free",
    name: "Starter",
    emoji: "🚀",
    tagline: "Get started today",
    monthlyPrice: 0,
    annualPrice: 0,
    oneTime: false,
    cta: "Start for free",
    ctaNote: "No credit card required",
    badge: null,
    popular: false,
    special: null,
    usagePool: "100 credits / month",
    features: [
      "Live AI answers in under 2 seconds",
      "Works on Zoom, Meet, Teams and phone calls",
      "~50 min live interview or 6 mock sessions",
      "Resume builder with free PDF download",
      "100 credits refresh every month",
    ],
    notIncluded: [
      "Screen share exclusion (desktop app)",
      "AI resume rewrite for job postings",
      "Session recordings",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "👑",
    tagline: "No limits. Full power.",
    monthlyPrice: 24.99,
    annualPrice: 12.42,
    oneTime: false,
    cta: "Get Pro",
    ctaNote: "7-day money back guarantee",
    badge: "Most popular",
    popular: true,
    special: null,
    usagePool: "5,000 credits / month",
    features: [
      "5,000 credits refresh every month",
      "~40 hours live interviews or 300+ mock sessions",
      "Desktop app, completely invisible on screen share",
      "Every interview saved and reviewable",
      "AI rewrites your resume for any job posting",
    ],
    notIncluded: [],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    emoji: "♾️",
    tagline: "Pay once. Own forever.",
    monthlyPrice: 299,
    annualPrice: 299,
    oneTime: true,
    cta: "Get Lifetime",
    ctaNote: "One payment, yours forever",
    badge: "Best deal",
    popular: false,
    special: "lifetime",
    usagePool: "5,000 credits every month, forever",
    features: [
      "5,000 credits every month, forever, with nothing to renew",
      "~40 hours live interviews or 300+ mock sessions",
      "Every Pro feature included, forever",
      "Protected from future price increases",
      "Pays for itself in under 12 months",
    ],
    notIncluded: [],
  },
  {
    id: "teams",
    name: "Teams",
    emoji: "🏢",
    tagline: "Five seats. One invoice.",
    monthlyPrice: 49,
    annualPrice: 33,
    oneTime: false,
    cta: "Get Teams",
    ctaNote: "5 seats included",
    badge: null,
    popular: false,
    special: "teams",
    usagePool: "10,000 credits every month across 5 seats",
    features: [
      "10,000 credits per month across 5 seats",
      "~80 hours live interviews or 650+ mock sessions",
      "5 full Pro seats at $9.80 per user each month",
      "One invoice, one account for all 5",
      "All Pro features across every seat",
    ],
    notIncluded: [],
  },
];

// ─── COMPARISON ROWS ──────────────────────────────────────────────────────────
const ROWS: { cat: string; label: string; free: boolean | string; pro: boolean | string; lifetime: boolean | string; teams: boolean | string }[] = [
  { cat: "Live Copilot",  label: "AI answers in real-time",              free: true,           pro: true,          lifetime: true,         teams: true         },
  { cat: "Live Copilot",  label: "Answer speed",                         free: "Under 2 sec",  pro: "Under 2 sec", lifetime: "Under 2 sec",teams: "Under 2 sec" },
  { cat: "Live Copilot",  label: "Monthly allowance",                    free: "50 min/mo",    pro: "~40 hrs/mo",  lifetime: "~40 hrs/mo", teams: "~80 hrs/mo" },
  { cat: "Live Copilot",  label: "Zoom, Teams, Meet support",            free: true,           pro: true,          lifetime: true,         teams: true         },
  { cat: "Live Copilot",  label: "Excluded from screen share",           free: "Browser only", pro: "Desktop app", lifetime: "Desktop app",teams: "Desktop app"},
  { cat: "Live Copilot",  label: "Camera stealth mode",                  free: false,          pro: true,          lifetime: true,         teams: true         },
  { cat: "Mock Practice", label: "Mock interview sessions",              free: "6/month",      pro: "300+/month",  lifetime: "300+/month", teams: "650+/month" },
  { cat: "Mock Practice", label: "Questions tailored to role and JD",    free: true,           pro: true,          lifetime: true,         teams: true         },
  { cat: "Mock Practice", label: "Session recordings",                   free: false,          pro: true,          lifetime: true,         teams: true         },
  { cat: "Resume",        label: "Resume builder and PDF download",      free: true,           pro: true,          lifetime: true,         teams: true         },
  { cat: "Resume",        label: "Verify AI reads your resume",          free: true,           pro: true,          lifetime: true,         teams: true         },
  { cat: "Resume",        label: "AI rewrite for any job posting",       free: false,          pro: true,          lifetime: true,         teams: true         },
  { cat: "Apps",          label: "Web app, no install needed",           free: true,           pro: true,          lifetime: true,         teams: true         },
  { cat: "Apps",          label: "Windows desktop app",                  free: false,          pro: true,          lifetime: true,         teams: true         },
  { cat: "Apps",          label: "macOS desktop app",                    free: false,          pro: true,          lifetime: true,         teams: true         },
  { cat: "AI",            label: "AI model",                             free: "Standard",     pro: "Best",        lifetime: "Best",       teams: "Best"       },
  { cat: "Billing",       label: "Monthly credits",                      free: "100/mo",       pro: "5,000/mo",    lifetime: "5,000/mo",   teams: "10,000/mo"  },
  { cat: "Billing",       label: "Future features included",             free: false,          pro: true,          lifetime: true,         teams: true         },
  { cat: "Teams",         label: "Seats",                                free: "1",            pro: "1",           lifetime: "1",          teams: "5"          },
  { cat: "Teams",         label: "Centralized billing",                  free: false,          pro: false,         lifetime: false,        teams: true         },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is the live copilot?",
    a: "During your real interview, Verchor listens through your microphone, reads your resume, and streams a tailored answer to your screen in under 2 seconds. The interviewer sees nothing. It works on Zoom, Google Meet, Teams, phone calls, and in-person interviews.",
  },
  {
    q: "What are credits?",
    a: "Credits are a simple usage meter. Live copilot costs 2 credits per minute. A mock session costs 15 credits. Starter gets 100 credits/month (~50 min live or 6 mock sessions). Pro and Lifetime get 5,000 credits/month (~40 hrs live or 300+ mock sessions). Teams gets 10,000/month across 5 seats. Credits reset on the 1st of every month.",
  },
  {
    q: "Why do I need the desktop app for full stealth?",
    a: "Browsers cannot reliably exclude windows from screen share. The desktop app uses OS-level window exclusion that works 100% of the time on Zoom, Teams, Meet, and Webex. Camera stealth on Pro and Lifetime goes further and hides the overlay even if someone looks at your physical screen.",
  },
  {
    q: "What does AI resume tailoring do?",
    a: "You paste a job description and your resume. The AI rewrites your resume to match the exact keywords, skills, and language in that posting. The kind an ATS scans for before a human reads it. Available on Pro, Lifetime, and Teams.",
  },
  {
    q: "How does Teams work?",
    a: "Each of the 5 seats gets its own full unlimited Pro access. There are no shared credits. One invoice covers all 5 users. At $49 per month total, that works out to $9.80 per user versus $24.99 each bought individually.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings in one click. You keep full access until the end of your billing period. Upgrades take effect immediately. Downgrades take effect at the next billing cycle. Lifetime has no subscription to cancel.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Resume text is only used during your session. Interview audio is processed on your device. Raw audio is never sent to our servers. We do not sell your data or use it to train AI models.",
  },
  {
    q: "What is the refund policy?",
    a: "Full refund within 7 days of your first purchase, no questions asked. This applies to Pro, Lifetime, and Teams. Email support@verchor.com and we sort it out the same day.",
  },
];

// ─── Table cell ───────────────────────────────────────────────────────────────
function Cell({ val, accent, orange }: { val: boolean | string; accent?: boolean; orange?: boolean }) {
  if (val === false) return <div className="flex justify-center"><Dash /></div>;
  if (val === true) return <div className="flex justify-center"><Check color={orange ? "orange" : accent ? "violet" : "emerald"} /></div>;
  const c = orange ? "text-orange-700" : accent ? "text-violet-700" : "text-gray-600";
  return <p className={`text-center text-xs font-medium ${c}`}>{val}</p>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="font-semibold text-gray-800 text-sm group-hover:text-violet-700 transition-colors">{q}</span>
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
    card:    { background: "linear-gradient(160deg, #faf7ff 0%, #f0e9ff 60%, #fff5f0 100%)", border: "2px solid rgba(109,40,217,0.3)", boxShadow: "0 20px 60px rgba(109,40,217,0.15)" },
    stripe:  "linear-gradient(90deg, #6d28d9, #9333ea, #ea580c)",
    badge:   { background: "linear-gradient(135deg, #6d28d9, #ea580c)" },
    btn:     { background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: "0 4px 20px rgba(109,40,217,0.35)" },
    pool:    { background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.15)", color: "#6d28d9" },
    check:   "violet" as const,
  };
  if (plan.special === "lifetime") return {
    card:    { background: "linear-gradient(145deg, #fff9f0 0%, #fff3e0 100%)", border: "1.5px solid rgba(234,88,12,0.22)" },
    stripe:  "linear-gradient(90deg, #f97316, #ea580c)",
    badge:   { background: "linear-gradient(135deg, #f97316, #ea580c)" },
    btn:     { background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 20px rgba(234,88,12,0.3)" },
    pool:    { background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", color: "#c2410c" },
    check:   "orange" as const,
  };
  if (plan.special === "teams") return {
    card:    { background: "linear-gradient(145deg, #f0f7ff 0%, #e8f4ff 100%)", border: "1.5px solid rgba(59,130,246,0.22)" },
    stripe:  "linear-gradient(90deg, #3b82f6, #6366f1)",
    badge:   { background: "linear-gradient(135deg, #3b82f6, #6366f1)" },
    btn:     { background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" },
    pool:    { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", color: "#1d4ed8" },
    check:   "blue" as const,
  };
  return {
    card:    { background: "#ffffff", border: "1px solid #e5e7eb" },
    stripe:  "#e5e7eb",
    badge:   { background: "#374151" },
    btn:     { background: "#111827" },
    pool:    { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", color: "#4f46e5" },
    check:   "emerald" as const,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [user,     setUser]     = useState<any>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);
  const [annual,   setAnnual]   = useState(false);
  const [showAll,  setShowAll]  = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) { const p = await getUserProfile(u.uid); setProfile(p); }
    });
    return () => unsub();
  }, []);

  const handleCheckout = async (planId: "pro" | "lifetime" | "teams") => {
    if (!user) { setShowAuth(true); return; }
    setLoading(planId);
    setCheckoutError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ plan: planId, annual: planId !== "lifetime" && annual, uid: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || "Could not start checkout. Please try again.");
      }
    } catch {
      setCheckoutError("Network error. Please check your connection and try again.");
    }
    setLoading(null);
  };

  const currentPlan = profile?.plan as PlanId | undefined;
  const visibleRows = showAll ? ROWS : ROWS.slice(0, 10);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
      <PageHeader />

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-20 pb-20 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 75%, #fdf8ff 100%)" }}>
        <div className="absolute pointer-events-none top-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)", filter: "blur(80px)", transform: "translateX(-50%)" }} />
        <div className="absolute pointer-events-none top-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(234,88,12,0.10) 0%, transparent 65%)", filter: "blur(70px)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-3xl mx-auto z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-violet-200/70 shadow-sm backdrop-blur-sm mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
            </span>
            <span className="text-[11px] font-semibold text-gray-600 tracking-wide">Simple pricing. No hidden fees. Cancel anytime.</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
            className="text-4xl md:text-[3.2rem] font-black tracking-tight leading-[1.08] text-gray-900 mb-5">
            The AI that gets you<br />
            <span style={{ background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #ea580c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              the job.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="text-gray-500 text-[1.05rem] leading-relaxed mb-8 max-w-2xl mx-auto">
            Hears your interviewer. Shows you the perfect answer. In 1.8 seconds. Completely invisible to everyone else on the call.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 mb-10">
            {["Secure checkout via Stripe", "Cancel anytime", "7-day money back", "Audio never stored"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Check color="emerald" />
                {t}
              </span>
            ))}
          </motion.div>

          {/* Billing toggle */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-2.5">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Billing period</p>
            <div className="inline-flex items-center bg-white/80 backdrop-blur-sm border-2 border-violet-200/70 rounded-full p-1.5 shadow-md gap-1">
              <button onClick={() => setAnnual(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${!annual ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Monthly
              </button>
              <button onClick={() => setAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center gap-2 ${annual ? "text-white" : "text-violet-700 hover:text-violet-900"}`}
                style={annual ? { background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: "0 2px 12px rgba(109,40,217,0.3)" } : {}}>
                Annual
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full text-white"
                  style={{ background: annual ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                  Save 50%
                </span>
              </button>
            </div>
            <AnimatePresence>
              {!annual && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold text-violet-600 cursor-pointer hover:text-violet-800 transition-colors"
                  onClick={() => setAnnual(true)}>
                  Switch to annual. Pro drops to $12.42/mo. Teams drops to $33/mo.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ══ CHECKOUT ERROR BANNER ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {checkoutError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 bg-red-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl max-w-md w-[90vw]">
            <span className="flex-1">{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} className="text-white/70 hover:text-white transition-colors ml-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PLAN CARDS — all 4 side by side ════════════════════════════════════ */}
      <section className="relative px-6 pb-20"
        style={{ background: "linear-gradient(180deg, #fdf8ff 0%, #ffffff 30%)" }}>
        <div className="max-w-7xl mx-auto -mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
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
                  className="relative rounded-2xl flex flex-col overflow-hidden"
                  style={s.card}>

                  {/* Top stripe */}
                  <div className="h-[3px] w-full" style={{ background: s.stripe }} />

                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-3 right-3 text-[9px] font-black px-2.5 py-1 rounded-full text-white"
                      style={s.badge}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-5 pb-4">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{plan.emoji}</span>
                      <h2 className="text-base font-black text-gray-900">{plan.name}</h2>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-400 mb-4 tracking-wide">{plan.tagline}</p>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-gray-900 tracking-tight">
                          {price === 0 ? "Free" : `$${price}`}
                        </span>
                        {price > 0 && (
                          <span className="text-xs text-gray-400 font-medium">
                            {plan.oneTime ? " one-time" : " / mo"}
                          </span>
                        )}
                      </div>
                      {annual && savings > 0 && (
                        <p className="text-[11px] mt-0.5 font-semibold text-emerald-600">
                          ${Math.round(plan.annualPrice * 12)}/yr billed. Save ${savings}.
                        </p>
                      )}
                      {plan.oneTime && (
                        <p className="text-[11px] mt-0.5 font-semibold text-emerald-600">
                          Pays for itself in under 12 months.
                        </p>
                      )}
                      {price === 0 && <p className="text-[11px] text-gray-400 mt-0.5">No credit card needed</p>}
                    </div>

                    {/* Usage pill */}
                    <div className="rounded-lg px-3 py-2 mb-4" style={s.pool}>
                      <p className="text-[11px] font-black" style={{ color: s.pool.color }}>{plan.usagePool}</p>
                    </div>

                    {/* CTA */}
                    {plan.id === "free" ? (
                      <button onClick={() => !user && setShowAuth(true)}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                          isCurrent || user ? "bg-gray-100 text-gray-400 cursor-default" : "bg-gray-900 hover:bg-gray-700 text-white"
                        }`}>
                        {isCurrent ? "Current plan" : user ? "You're on Starter" : plan.cta}
                      </button>
                    ) : (
                      <button onClick={() => handleCheckout(plan.id as "pro" | "lifetime" | "teams")}
                        disabled={!!loading || isCurrent}
                        className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ ...(isCurrent ? { background: "#d1d5db" } : s.btn) }}>
                        {isCurrent ? "Current plan" : loading === plan.id ? "Redirecting..." : plan.cta}
                      </button>
                    )}
                    <p className="text-center text-[10px] text-gray-400 mt-1.5">{plan.ctaNote}</p>
                  </div>

                  {/* Features */}
                  <div className="px-5 pb-5 border-t border-gray-100/80 pt-4 flex-1">
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
                className="text-violet-600 font-bold hover:text-violet-800 underline underline-offset-2 transition-colors">
                Pay annually and save 50%. Pro drops to $12.42/mo. Teams drops to $33/mo.
              </button>
            </motion.p>
          )}
        </div>
      </section>

      {/* ══ WHY EACH PLAN ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Who each plan is built for</h2>
            <p className="text-gray-400 text-sm">Pick the one that matches where you are right now.</p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                emoji: "🚀", name: "Starter", color: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.16)", tc: "#4f46e5",
                who: "Testing the waters",
                items: ["Have interviews coming up soon", "Want to try it before committing", "Need a solid resume right now", "Casual job hunting, not urgent"],
              },
              {
                emoji: "👑", name: "Pro", color: "rgba(109,40,217,0.07)", border: "rgba(109,40,217,0.18)", tc: "#6d28d9",
                who: "Serious job seekers",
                items: ["Actively interviewing every week", "Targeting competitive companies", "Need screen share protection", "Want session recordings to review"],
              },
              {
                emoji: "♾️", name: "Lifetime", color: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.16)", tc: "#ea580c",
                who: "Hate subscriptions",
                items: ["Prefer paying once and being done", "Plan to interview across multiple years", "Want every future feature included", "Want protection from price increases"],
              },
              {
                emoji: "🏢", name: "Teams", color: "rgba(59,130,246,0.07)", border: "rgba(59,130,246,0.16)", tc: "#1d4ed8",
                who: "Groups and bootcamps",
                items: ["Bootcamps prepping students together", "Recruiting firms building candidate pipelines", "Groups of friends interviewing at the same time", "Anyone managing multiple users under one bill"],
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
                <div className="grid grid-cols-5 bg-gray-50/80 border-b border-gray-200">
                  <div className="px-5 py-4" />
                  {[
                    { name: "Starter", price: "Free",                             style: "" },
                    { name: "Pro",     price: annual ? "$12.42/mo" : "$24.99/mo", style: "bg-violet-50/60 text-violet-700" },
                    { name: "Lifetime",price: "$299 once",                        style: "bg-orange-50/40 text-orange-700" },
                    { name: "Teams",   price: annual ? "$33/mo" : "$49/mo",       style: "" },
                  ].map(({ name, price, style }, i) => (
                    <div key={i} className={`px-3 py-4 text-center border-l border-gray-200 ${style}`}>
                      <p className={`text-sm font-black ${style.includes("violet") ? "text-violet-700" : style.includes("orange") ? "text-orange-700" : "text-gray-900"}`}>{name}</p>
                      <p className={`text-[11px] mt-0.5 font-medium ${style.includes("violet") ? "text-violet-400" : style.includes("orange") ? "text-orange-400" : "text-gray-400"}`}>{price}</p>
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
                          <div className="grid grid-cols-5 bg-gray-50/40 border-b border-gray-100">
                            <div className="px-5 py-2 col-span-5">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.cat}</span>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-5 border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                          <div className="px-5 py-3.5"><span className="text-xs text-gray-600">{row.label}</span></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 flex items-center justify-center"><Cell val={row.free} /></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 bg-violet-50/10 flex items-center justify-center"><Cell val={row.pro} accent /></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 bg-orange-50/10 flex items-center justify-center"><Cell val={row.lifetime} orange /></div>
                          <div className="px-3 py-3.5 border-l border-gray-100 flex items-center justify-center"><Cell val={row.teams} /></div>
                        </div>
                      </div>
                    );
                  });
                })()}

                <div className="border-t border-gray-100">
                  <button onClick={() => setShowAll(!showAll)}
                    className="w-full py-4 text-sm font-semibold text-violet-600 hover:text-violet-800 hover:bg-violet-50/30 transition-colors flex items-center justify-center gap-2">
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

      {/* ══ GUARANTEE ══════════════════════════════════════════════════════════ */}
      <section className="py-14 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <FadeUp>
            <div className="rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-center gap-6 shadow-sm"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.04), rgba(234,88,12,0.03))", border: "1px solid rgba(109,40,217,0.1)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)" }}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-1">7-day money back guarantee</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Not happy within 7 days of your first purchase? Email{" "}
                  <a href="mailto:support@verchor.com" className="font-semibold text-violet-700 hover:underline">
                    support@verchor.com
                  </a>{" "}
                  and we refund you in full. No forms, no questions, same day. Applies to Pro, Lifetime, and Teams.
                </p>
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
              <a href="mailto:support@verchor.com" className="text-violet-600 font-semibold hover:underline">Email us</a>
              {" "}and we reply same day.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 75%, #fdf8ff 100%)" }}>
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.09) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-xl mx-auto z-10">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight leading-tight">
              Your next interview is<br />
              <span style={{ background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #ea580c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                your best interview.
              </span>
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              Start free today. No card needed. See it work in your next real interview, then decide.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => user ? window.location.href = "/real-interview" : setShowAuth(true)}
                className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", boxShadow: "0 6px 24px rgba(109,40,217,0.3)" }}>
                {user ? "Go to dashboard →" : "Start for free"}
              </button>
              <Link href="/real-interview"
                className="px-8 py-3.5 rounded-xl border border-gray-200 bg-white hover:border-violet-300 text-gray-700 hover:text-violet-700 font-semibold text-sm transition-all">
                Try live copilot now
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-[11px] text-gray-400">
              {["50,000+ interviews assisted", "87% offer rate", "1.8s answer speed", "100% private"].map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-violet-400" />
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
