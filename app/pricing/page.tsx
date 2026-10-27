"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { type PlanId, type UserProfile } from "../lib/credits";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";
import { PageHeader } from "../../components/PageShell";
import "../home-v2.css";
import { copyFor } from "../../components/feedback/messages";
import InterviewMinutes from "../../components/InterviewMinutes";
import type { LocalPlanPrices } from "../../data/localPrices";
import { MAYA_ADDON, MOCK_PLAN } from "../../data/mayaAddon";
import {
  PUBLIC_CREDIT_COSTS, PUBLIC_PLAN_CAPACITY, PLAN_MONTHLY_CREDITS, INDIA_PLAN_ALLOWANCE,
  answersFor, TRIAL_ANSWERS, TRIAL_DAYS,
} from "../../data/productFacts";

// Yearly plans are hidden (owner, 2026-09-29). A job search lasts one to three months, and
// rival tools get their loudest complaints for advertising a low monthly figure that needs a
// year paid upfront. The yearly prices in ALL_PLANS and the checkout route are kept, unused,
// so turning this on later needs no other change, but they were priced for the old monthly
// prices and must be reviewed first.
const ANNUAL_ENABLED = false;

// Every count on this page comes from the same numbers the server enforces.
const fmt = (n: number) => n.toLocaleString("en-US");
const FREE_ANSWERS = answersFor(PLAN_MONTHLY_CREDITS.free);
const MOCK_CREDITS = 20;   // what one guided mock session costs on average, see PUBLIC_CREDIT_COSTS

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
  /**
   * The monthly price in rupees, for buyers in India.
   *
   * Not a conversion of the dollar price. $29.99 converts to about Rs 2,868,
   * which is a month's phone bill there and simply does not sell. Rs 299 is
   * priced for the market and still keeps about forty percent after Stripe's
   * cut and the cost of the listening hours it buys.
   *
   * Display and charge read the same numbers: whatever is shown here has a
   * matching Stripe price behind it, chosen server side from the same address.
   */
  inrMonthly?: number;
  /** Credits a month on the rupee price. Smaller, because the price is. */
  inrCredits?: number;
  /** Listening hours a month on the rupee price. */
  inrHours?: number;
  /**
   * The whole year in rupees. Ten months for twelve, the same two-months-free
   * deal the dollar plans give. Stripe's fixed fee is also paid once instead of
   * twelve times, so annual is the better of the two for us as well as the
   * cheaper one for them.
   */
  inrAnnualYearly?: number;
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
    tagline: `New accounts start with ${TRIAL_DAYS} days of Pro free: ${TRIAL_ANSWERS} answers, no card.`,
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
      "Designed for common Zoom, Meet, Teams and phone workflows",
      "Resume builder with free PDF download",
      `${TRIAL_DAYS} day Pro trial with ${TRIAL_ANSWERS} answers, then Starter`,
      "Live listening included, subject to fair use",
      "Desktop capture exclusion for standard screen-share paths",
    ],
    notIncluded: [
      "More answers each month (Pro and Max)",
      "AI resume rewrite for job postings",
      "Saved interview history",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "👑",
    tagline: "The complete toolkit for an active job search.",
    monthlyPrice: 34.99,
    inrMonthly: 699,
    inrAnnualYearly: 6990,
    inrCredits: INDIA_PLAN_ALLOWANCE.pro.credits,
    inrHours: INDIA_PLAN_ALLOWANCE.pro.audioMinutes / 60,
    // Yearly is hidden (ANNUAL_ENABLED). This is the OLD yearly price ($299 a year, anchored to
    // a clean total and shown per month), left in place unused; review before turning it on.
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
      "Desktop capture exclusion for standard screen-share paths",
      "Saved interview history for review",
      "AI rewrites your resume for any job posting",
      "Answers refresh automatically each month",
      "Live listening included, subject to fair use",
    ],
    notIncluded: [],
  },
  {
    id: "max",
    name: "Max",
    emoji: "👑",
    tagline: "Maximum access for interview-heavy weeks.",
    monthlyPrice: 79.99,
    inrMonthly: 1299,
    inrAnnualYearly: 12990,
    inrCredits: INDIA_PLAN_ALLOWANCE.max.credits,
    inrHours: INDIA_PLAN_ALLOWANCE.max.audioMinutes / 60,
    annualPrice: 41.58,   // old yearly price, unused while ANNUAL_ENABLED is false
    oneTime: false,
    cta: "Get Max",
    ctaNote: "Cancel anytime",
    badge: "Highest access",
    popular: false,
    special: null,
    usagePool: PUBLIC_PLAN_CAPACITY.max.summary,
    features: [
      "Everything in Pro, with our largest monthly allowance",
      "Best AI models for polished, natural answers",
      "Answers grounded in your resume, role and job description",
      "Live listening included, subject to fair use",
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

/**
 * The allowance lines, rewritten for a rupee plan.
 *
 * A card that promises fifteen hours to someone whose account will hold six is
 * not a pricing decision, it is a refund. Both the pill and the two bullets
 * that name numbers are swapped together, from the same values the webhook
 * writes onto the user.
 */
// No numbers on paid plans (owner, 2026-10-27), so India shows the same line.
const usagePoolFor = (plan: typeof PRO_PLAN, _india: boolean) => plan.usagePool;

const featuresFor = (plan: typeof PRO_PLAN, india: boolean) =>
  india && plan.inrCredits
    ? plan.features.map((line) =>
        /answers refresh automatically/.test(line)
          ? "Answers for 30 days"
          : line)
    : plan.features;

const perMonth = (plan: typeof PRO_PLAN, annual: boolean, india = false, local: LocalPlanPrices | null = null) => {
  if (local && !annual && (plan.id === "pro" || plan.id === "max")) return `${local.symbol}${local[plan.id]}/mo`;
  if (india) {
    const rupees = annual
      ? plan.inrAnnualYearly && Math.round(plan.inrAnnualYearly / 12)
      : plan.inrMonthly;
    if (rupees) return annual ? `₹${rupees}/mo` : `₹${rupees} for 1 month`;
  }
  return `$${(annual ? plan.annualPrice : plan.monthlyPrice).toFixed(2)}/mo`;
};

// ─── COMPARISON ROWS ──────────────────────────────────────────────────────────
const ROWS: { cat: string; label: string; free: boolean | string; pro: boolean | string; max: boolean | string }[] = [
  { cat: "Live Copilot",  label: "AI answers in real-time",              free: true,           pro: true,          max: true},
  { cat: "Live Copilot",  label: "Answer response target",               free: "<2 sec target", pro: "<2 sec target", max: "<2 sec target"},
  { cat: "Live Copilot",  label: "Live answers",                         free: `${FREE_ANSWERS}, once`,               pro: "Every month",               max: "Largest allowance, every month"},
  { cat: "Live Copilot",  label: "Zoom, Teams, Meet support",            free: true,           pro: true,          max: true},
  { cat: "Live Copilot",  label: "Desktop capture exclusion",            free: "Included",     pro: "Included",     max: "Included"},
  { cat: "Live Copilot",  label: "Camera practice mode",                 free: false,          pro: true,          max: true},
  { cat: "Mock Practice", label: "Mock interview with live Maya",        free: "1 free interview", pro: `Add for $${MAYA_ADDON.usd}/month`, max: "Included"},
  { cat: "Mock Practice", label: "Questions tailored to role and JD",    free: true,           pro: true,          max: true},
  { cat: "Mock Practice", label: "Saved interview history",              free: false,          pro: true,          max: true},
  { cat: "Resume",        label: "Resume builder and PDF download",      free: true,           pro: true,          max: true},
  { cat: "Resume",        label: "Verify AI reads your resume",          free: true,           pro: true,          max: true},
  { cat: "Resume",        label: "AI rewrite for any job posting",       free: false,          pro: true,          max: true},
  { cat: "Apps",          label: "Web app, no install needed",           free: true,           pro: true,          max: true},
  { cat: "Apps",          label: "Windows desktop app",                  free: true,           pro: true,          max: true},
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
    a: `A live answer, a screen read and most other actions use one answer. Every new account starts with a ${TRIAL_DAYS} day Pro trial with ${TRIAL_ANSWERS} answers, no card, enough to try it in real interviews. Pro and Max include a monthly allowance of answers, Max the largest. Tailoring a resume uses 4. Live answers and AI resume tools share this balance; interviews with Maya use none.  Paid answers refresh monthly and do not roll over. The cost is shown before an action that uses your answers.`
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
    a: `Both plans include the same premium AI access, resume-grounded answers, desktop capture controls, saved interviews, and AI resume tailoring. Max has the larger monthly allowance of answers, includes the mock interview with Maya, and adds priority support. Max increases capacity, not answer accuracy.`,
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
    <div className="hv2-faq-item">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="hv2-faq-q">
        <span className="hv2-serif">{q}</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 flex-shrink-0" style={{ color: "var(--faint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <p className="hv2-faq-a">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "More answers each month" becomes "more answers each month" after a label, but "AI resume" keeps its capitals. */
const lowerFirst = (t: string) => (/^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<"pro" | "max" | null>(null);
  const [pendingAutopay, setPendingAutopay] = useState(false);
  // The Maya add-on, ticked per plan card (owner, 2026-10-26: "+$10 for the mock interview").
  const [mayaPick, setMayaPick] = useState<Record<string, boolean>>({});
  const [openLists, setOpenLists] = useState<Record<string, boolean>>({});
  // Signing in from the minutes card keeps the buyer on this page, next to the slider they set.
  const [stayAfterAuth, setStayAfterAuth] = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);
  // Always monthly while ANNUAL_ENABLED is false: nothing on the page can turn it on.
  const [annual,   setAnnual]   = useState(false);

  // Where the visitor is, asked of the server rather than the browser.
  //
  // This only chooses what the page shows. What the card is charged is decided
  // again on the server when the checkout session is made, from the same
  // address, because a timezone is a setting and the gap between Rs 299 and
  // $29.99 is ninety percent. If the two ever disagree, the charge wins and the
  // buyer sees a surprise, so both read the same source.
  const [india, setIndia] = useState(false);
  // UK, Canada, Australia: their own currency, when the server says those prices exist in Stripe.
  const [localPrices, setLocalPrices] = useState<LocalPlanPrices | null>(null);
  const [previewIndia, setPreviewIndia] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // ?preview=india shows the India page on a developer machine only (owner: not for the public). Display only: the checkout still
    // decides rupees from the buyer's real address and refuses the minutes outside India.
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "india") { setIndia(true); setPreviewIndia(true); return; }
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.localPrices) setLocalPrices(d.localPrices as LocalPlanPrices);
        if (d?.country !== "IN") return;
        setIndia(true);
      })
      .catch(() => { /* dollars, which is the safe default */ });
    return () => { cancelled = true; };
  }, []);
  const [showAll,  setShowAll]  = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutReturn, setCheckoutReturn] = useState<"success" | "credits" | "canceled" | null>(null);

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
    else if (params.get("credits") === "success") setCheckoutReturn("credits");
    else if (params.get("canceled") === "true") setCheckoutReturn("canceled");
  }, []);

  // autopay: India only, a monthly card subscription instead of the one month paid once (owner, 2026-10-23).
  const handleCheckout = async (planId: "pro" | "max", checkoutUser: User | null = user, autopay = false) => {
    // An India month paid once is not a subscription, so its owner may add a month or move to AutoPay. Only a real
    // subscription is sent to Account & Billing (the "Add 1 more month" button was refused here, 2026-10-23).
    if (hasPaidPlan && !(indiaMonthly && !profile?.stripeSubscriptionId)) {
      setCheckoutError("You already have an active plan. Open Account & Billing to change it securely without creating a second subscription.");
      return;
    }
    if (!checkoutUser) {
      setPendingPlan(planId);
      setPendingAutopay(autopay);
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
        body: JSON.stringify({ plan: planId, annual, uid: checkoutUser.uid, email: checkoutUser.email, ...(autopay ? { autopay: true } : {}),
                               ...(mayaPick[planId] && planId !== "max" ? { maya: true } : {}) }),
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

  // The Practice plan (owner, 2026-10-26): interviews with Maya plus some live answers, for people who mostly practise.
  const [practiceLoading, setPracticeLoading] = useState(false);
  const handlePractice = async () => {
    if (!user) { setStayAfterAuth(true); setShowAuth(true); return; }
    setPracticeLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ plan: "mock", uid: user.uid }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) { window.location.href = data.url; return; }
      setCheckoutError(typeof data.error === "string" && res.status === 409
        ? data.error
        : "We could not start checkout just now. You have not been charged. Please try again.");
    } catch {
      setCheckoutError(copyFor("offline").body);
    }
    setPracticeLoading(false);
  };
  const practicePrice = india ? `₹${MOCK_PLAN.inr}` : localPrices ? `${localPrices.symbol}${MOCK_PLAN.local[localPrices.currency]}` : `$${MOCK_PLAN.usd}`;

  const openFreeAccount = () => {
    setPendingPlan(null);
    setShowAuth(true);
  };

  const handleAuthSuccess = (signedInUser: User) => {
    setUser(signedInUser);
    setShowAuth(false);
    const planToBuy = pendingPlan;
    setPendingPlan(null);
    if (planToBuy) void handleCheckout(planToBuy, signedInUser, pendingAutopay);
    else if (stayAfterAuth) setStayAfterAuth(false);
    else window.location.href = "/real-interview";
  };

  const clearCheckoutReturn = () => {
    setCheckoutReturn(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("canceled");
    url.searchParams.delete("credits");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const currentPlan = profile?.plan as PlanId | undefined;
  // A trial is Pro with nothing paid: its owner can buy any plan.
  const onTrial = profile?.planSource === "trial";
  const hasPaidPlan = Boolean(currentPlan && currentPlan !== "free" && !onTrial);
  const indiaMonthly = india && !annual;
  const visibleRows = showAll ? ROWS : ROWS.slice(0, 10);

  return (
    <div className="marketing hv2 min-h-screen">
      {showAuth && <AuthModal open={showAuth} initialMode="signup" onClose={() => { setShowAuth(false); setPendingPlan(null); }} onSuccess={handleAuthSuccess} />}
      <PageHeader />

      {/* Return messages are verified against the live profile. A success query by itself never unlocks a paid plan. */}
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
                : checkoutReturn === "credits"
                  ? "Payment received. Your extra answers are being added now."
                : currentPlan === "pro" || currentPlan === "max"
                  ? `Your ${currentPlan === "pro" ? "Pro" : "Max"} plan is active. Your monthly answers are ready.`
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

      {previewIndia && (
        <p className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          Preview of the India page. Checkout uses your real location.
        </p>
      )}

      {/* ══ HEADING ═════════════════════════════════════════════════════════ */}
      <section className="hv2-hero hv2-pricing-hero" style={{ paddingTop: 112 }}>
        <div className="hv2-wrap">
          <h1 className="hv2-serif hv2-h1" style={{ maxWidth: "11em" }}>
            Pick a plan, <em>or start free.</em>
          </h1>
          <p className="hv2-lead">
            Fast, resume-grounded answer suggestions, with desktop controls designed for standard screen-share paths. Every plan draws on one
            balance of answers, and the cost is shown before an action uses any.
          </p>
          <p className="hv2-fine">{india
            ? "Secure Stripe checkout. Pay once with UPI or card. Nothing renews automatically."
            : "Secure Stripe checkout. Cancel anytime."}</p>
          {/* The Practice plan sits below the main plans; people judge from the top of the page and may never scroll to it
              (owner, 2026-10-27), so it is named here with a jump to it. */}
          <a href="#practice" className="hv2-practice-jump">
            <span>Only want practice interviews with Maya? <strong>Practice is {practicePrice} {india ? "for 1 month" : "a month"}.</strong></span>
            <span className="hv2-practice-jump-cta">See Practice</span>
          </a>
        </div>
      </section>

      {/* ══ PLANS ═══════════════════════════════════════════════════════════ */}
      <section className="hv2-section hv2-pricing-plans" style={{ paddingTop: 72 }}>
        <div className="hv2-wide">
          <div className="hv2-plans">
            {ALL_PLANS.map((plan) => {
              const price = plan.oneTime ? plan.monthlyPrice : (annual ? plan.annualPrice : plan.monthlyPrice);
              // Rupees for a monthly plan bought from India. Annual has no rupee price, so it stays in dollars and says so below.
              const rupeesForThisCard = !plan.oneTime && india
                ? (annual
                    ? plan.inrAnnualYearly && Math.round(plan.inrAnnualYearly / 12)
                    : plan.inrMonthly)
                : undefined;
              const localForThisCard = !plan.oneTime && !annual && localPrices && (plan.id === "pro" || plan.id === "max")
                ? `${localPrices.symbol}${localPrices[plan.id]}`
                : undefined;
              const shownPrice = rupeesForThisCard
                ? `₹${rupeesForThisCard}`
                : localForThisCard ?? (price === 0 ? "Free" : `$${price}`);
              const isCurrent = currentPlan === plan.id;
              const savings = !plan.oneTime && plan.monthlyPrice > 0
                ? Math.round((plan.monthlyPrice - plan.annualPrice) * 12)
                : 0;

              return (
                <div key={plan.id} className={`hv2-plan${plan.popular ? " is-main" : ""}`}>
                  <p className="hv2-plan-note">{plan.badge ?? "\u00a0"}</p>
                  <h2 className="hv2-serif hv2-plan-name">{plan.name}</h2>
                  <p className="hv2-tagline" style={{ maxWidth: "none" }}>{plan.tagline}</p>

                  <p className="hv2-price">
                    {shownPrice}
                    {price > 0 && <small>{plan.oneTime ? " one-time" : rupeesForThisCard && !annual ? " for 1 month" : " a month"}</small>}
                  </p>
                  {annual && savings > 0 && (
                    <p className="hv2-plan-sub">
                      {india && plan.inrAnnualYearly && plan.inrMonthly
                        ? `₹${plan.inrAnnualYearly}/yr billed. Save ₹${plan.inrMonthly * 12 - plan.inrAnnualYearly}.`
                        : `$${Math.round(plan.annualPrice * 12)}/yr billed. Save $${savings}.`}
                    </p>
                  )}
                  {plan.oneTime && <p className="hv2-plan-sub">Pays for itself in under 12 months.</p>}
                  {price === 0 && <p className="hv2-plan-sub">No credit card needed</p>}

                  <p className="hv2-plan-usage">{usagePoolFor(plan, india)}</p>

                  {plan.id === "free" ? (
                    <button onClick={() => !user && openFreeAccount()}
                      className={`hv2-btn hv2-btn-block${isCurrent || user ? " is-quiet" : ""}`}>
                      {isCurrent ? "Current plan" : user ? "Starter features included" : plan.cta}
                    </button>
                  ) : (
                    hasPaidPlan && !(indiaMonthly && !profile?.stripeSubscriptionId) ? (
                      <Link href="/account" className="hv2-btn hv2-btn-block">
                        {isCurrent ? "Manage current plan" : "Change plan securely"}
                      </Link>
                    ) : (
                      <>
                      {plan.id === "max" ? (
                        <p style={{ margin: "4px 0 12px", fontSize: 14, lineHeight: 1.45 }}>
                          <strong>Mock interview with Maya included</strong>
                          <br />
                          <span style={{ opacity: 0.75, fontSize: 13 }}>
                            A live video interviewer for practice interviews every month
                          </span>
                        </p>
                      ) : (
                      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "4px 0 12px", cursor: "pointer",
                        fontSize: 14, lineHeight: 1.45 }}>
                        <input type="checkbox" checked={!!mayaPick[plan.id]} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#267B42" }}
                          onChange={(e) => setMayaPick((m) => ({ ...m, [plan.id]: e.target.checked }))} />
                        <span>
                          <strong>Add mock interview with Maya</strong>{" "}
                          {india ? `+₹${MAYA_ADDON.inr}` : localPrices ? `+${localPrices.symbol}${MAYA_ADDON.local[localPrices.currency]}` : `+$${MAYA_ADDON.usd}`}
                          {india && !annual ? " for the month" : " a month"}
                          <br />
                          <span style={{ opacity: 0.75, fontSize: 13 }}>
                            A live video interviewer for practice interviews every month
                          </span>
                        </span>
                      </label>
                      )}
                      <button onClick={() => handleCheckout(plan.id as "pro" | "max")}
                        disabled={!!loading}
                        className="hv2-btn hv2-btn-block">
                        {loading === plan.id ? "Redirecting..." : india && !annual && isCurrent ? "Add 1 more month" : plan.cta}
                      </button>
                      </>
                    )
                  )}
                  <p className="hv2-plan-sub" style={{ textAlign: "center" }}>
                    {india && !annual && plan.id !== "free" ? "Pay once with UPI or card. No auto renewal." : plan.ctaNote}
                  </p>
                  {indiaMonthly && plan.id !== "free" && !profile?.stripeSubscriptionId && (
                    <p className="hv2-plan-sub" style={{ textAlign: "center", marginTop: 4 }}>
                      <button onClick={() => handleCheckout(plan.id as "pro" | "max", user, true)} disabled={!!loading} className="hv2-link" style={{ fontSize: "inherit" }}>
                        Or pay monthly with AutoPay
                      </button>
                      <br />
                      {isCurrent && profile?.planSource === "pass"
                        ? "Card AutoPay. The first charge comes when your current month ends."
                        : "Card AutoPay. Renews every month, cancel anytime."}
                    </p>
                  )}

                  {/* On a phone only the first four show, with "Show all", so the plans and Practice are not 3,000 pixels down. */}
                  <ul className={`hv2-plan-list${openLists[plan.id] ? " open" : ""}`}>
                    {[...featuresFor(plan, india).map((f) => ({ t: f, off: false })),
                      ...plan.notIncluded.map((t) => ({ t: `Not included: ${lowerFirst(t)}`, off: true }))]
                      .map((item, i) => (
                        <li key={item.t} className={[item.off ? "off" : "", i >= 4 ? "more" : ""].join(" ").trim() || undefined}>{item.t}</li>
                      ))}
                  </ul>
                  {featuresFor(plan, india).length + plan.notIncluded.length > 4 && !openLists[plan.id] && (
                    <button className="hv2-link hv2-more-btn" onClick={() => setOpenLists((o) => ({ ...o, [plan.id]: true }))}>
                      Show all
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ PRACTICE PLAN ═════════════════════════════════════════════════ */}
      <section id="practice" className="hv2-section" style={{ paddingTop: 24, scrollMarginTop: 90 }}>
        <div className="hv2-wide">
          <div className="hv2-plan" style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: "1 1 340px", minWidth: 0 }}>
              <p className="hv2-plan-note">Mostly practising?</p>
              <h2 className="hv2-serif hv2-plan-name">Practice</h2>
              <p className="hv2-tagline" style={{ maxWidth: "none" }}>
                Mock interviews with Maya, a live video interviewer who asks real questions for your role and tells you how to
                make every answer stronger. Plus live answers for your real interviews.
              </p>
              <ul className="hv2-plan-list" style={{ marginTop: 12 }}>
                <li>Practice interviews with Maya every month</li>
                <li>Live interview answers every month</li>
                <li>Feedback and a stronger answer for every question</li>
              </ul>
            </div>
            <div style={{ flex: "0 1 260px", minWidth: 220 }}>
              <p className="hv2-price">{practicePrice}<small>{india ? " for 1 month" : " a month"}</small></p>
              <button onClick={() => void handlePractice()} disabled={practiceLoading} className="hv2-btn hv2-btn-block" style={{ marginTop: 10 }}>
                {practiceLoading ? "Redirecting..." : "Get Practice"}
              </button>
              <p className="hv2-plan-sub" style={{ textAlign: "center" }}>
                {india ? "Pay once with UPI or card. No auto renewal." : "Cancel anytime"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INDIA: PAY BY THE MINUTE ═══════════════════════════════════════ */}
      {india && (
        <section className="hv2-section" style={{ paddingTop: 24 }}>
          <div className="hv2-wide">
            <InterviewMinutes user={user} where="pricing" onNeedSignIn={() => { setPendingPlan(null); setStayAfterAuth(true); setShowAuth(true); }} />
          </div>
        </section>
      )}

      {/* ══ WHAT EACH ACTION USES ═══════════════════════════════════════════ */}
      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">What each action <em>uses.</em></h2>
          <p className="hv2-p">One balance across the product. Mixed usage changes how many sessions you can run.</p>
          <dl className="hv2-facts">
            {PUBLIC_CREDIT_COSTS.map((item) => (
              <div key={item.action}>
                <dt>{item.action}</dt>
                <dd>{item.answers} {item.answers > 1 ? "answers" : "answer"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══ WHICH PLAN FITS ═════════════════════════════════════════════════ */}
      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Which plan <em>fits.</em></h2>
          <p className="hv2-p">
            Paid plans include the complete premium experience: premium AI, desktop capture controls and resume tailoring. The mock
            interview with Maya, a live video interviewer, is included in Max and can be added to Pro.
          </p>
          <ul className="hv2-index">
            {[
              {
                name: "Starter", who: "Testing the waters", note: "",
                items: ["Have interviews coming up soon", "Want to try it before committing", "Need a solid resume right now", "Casual job hunting, not urgent"],
              },
              {
                name: "Pro", who: "Serious job seekers",
                note: "You are actively applying and interviewing, but do not run several sessions every day.",
                items: ["Actively interviewing every week", "Targeting competitive companies", "Want desktop capture controls", "Want saved history to review"],
              },
              {
                name: "Max", who: "Interviewing constantly",
                note: `You have frequent interview loops, practice daily, or want the largest allowance and priority support.`,
                items: ["Several interviews every week", "Long technical loops back to back", "Practice with Maya between interviews", "Need the highest monthly capacity"],
              },
            ].map((col) => (
              <li key={col.name}>
                <div>
                  <h3 className="hv2-serif" style={{ fontSize: "clamp(1.45rem, 2.4vw, 1.9rem)", lineHeight: 1.15, margin: 0 }}>{col.name}</h3>
                  <p className="hv2-tagline">{col.who}</p>
                </div>
                <div>
                  {col.note && <p>{col.note}</p>}
                  <p className="hv2-points" style={col.note ? undefined : { marginTop: 0 }}>
                    {col.items.map((item) => <span key={item} style={{ display: "block" }}>{item}</span>)}
                  </p>
                  {col.name === "Pro" && !hasPaidPlan && (
                    <p style={{ marginTop: 14 }}>
                      <button onClick={() => handleCheckout("pro")} disabled={!!loading} className="hv2-link">
                        Get Pro, {perMonth(PRO_PLAN, annual, india, localPrices)}
                      </button>
                    </p>
                  )}
                  {col.name === "Max" && !hasPaidPlan && (
                    <p style={{ marginTop: 14 }}>
                      <button onClick={() => handleCheckout("max")} disabled={!!loading} className="hv2-link">
                        Get Max, {perMonth(MAX_PLAN, annual, india, localPrices)}
                      </button>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══ COMPARISON ══════════════════════════════════════════════════════ */}
      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">The full <em>comparison.</em></h2>
          <div className="hv2-table-wrap">
            <table className="hv2-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Feature</span></th>
                  {[
                    { name: "Starter", price: "Free" },
                    { name: PRO_PLAN.name, price: perMonth(PRO_PLAN, annual, india, localPrices) },
                    { name: MAX_PLAN.name, price: perMonth(MAX_PLAN, annual, india, localPrices) },
                  ].map(({ name, price }) => (
                    <th key={name} scope="col" className="hv2-table-plan">
                      {name}
                      <span>{price}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastCat = "";
                  return visibleRows.map((row, i) => {
                    const showCat = row.cat !== lastCat;
                    lastCat = row.cat;
                    return (
                      <Fragment key={i}>
                        {showCat && (
                          <tr className="cat"><th colSpan={4} scope="colgroup">{row.cat}</th></tr>
                        )}
                        <tr>
                          <td>{row.label}</td>
                          <td><Cell val={row.free} /></td>
                          <td><Cell val={row.pro} accent /></td>
                          <td><Cell val={row.max} /></td>
                        </tr>
                      </Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 18 }}>
            <button onClick={() => setShowAll(!showAll)} className="hv2-link">
              {showAll ? "Show less" : `Show all ${ROWS.length} features`}
            </button>
          </p>
        </div>
      </section>

      {/* ══ QUESTIONS ═══════════════════════════════════════════════════════ */}
      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Questions, <em>answered.</em></h2>
          <div className="hv2-faq">
            {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
          <p className="hv2-fine" style={{ marginTop: 28 }}>
            Still have questions? <a href="mailto:support@replysis.com" style={{ color: "var(--green)", textUnderlineOffset: 3 }}>Email us</a> and we reply same day.
          </p>
        </div>
      </section>

      {/* ══ CLOSING ═════════════════════════════════════════════════════════ */}
      <section className="hv2-section hv2-end">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Your next interview is <em>your best interview.</em></h2>
          <p className="hv2-p">Start free today. No card needed. See it work in your next real interview, then decide.</p>
          <p className="hv2-fine">
            <button
              onClick={() => user ? window.location.href = "/real-interview" : openFreeAccount()}
              className="hv2-btn">
              {user ? "Go to dashboard" : "Start for free"}
            </button>
            <Link href="/real-interview" className="hv2-link" style={{ marginLeft: 22 }}>Try live copilot now</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
