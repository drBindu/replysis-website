"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  History,
  Loader2,
  MessageCircleQuestion,
  Mic2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { db } from "../firebaseConfig";
import { useAuth } from "../../components/AuthProvider";
import { PageHeader } from "../../components/PageShell";
import { PLAN_MONTHLY_CREDITS, PUBLIC_PLAN_CAPACITY, type PlanId } from "../../data/productFacts";

type AccountProfile = {
  displayName?: string;
  email?: string;
  plan?: PlanId;
  credits?: number;
  creditsUsed?: number;
  creditsResetDate?: unknown;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeCancelAtPeriodEnd?: boolean;
  stripeCurrentPeriodEnd?: number | null;
  lastPaymentFailedAt?: unknown;
};

function dateValue(value: unknown): Date | null {
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") return toDate();
  }
  return null;
}

function formatDate(value: unknown) {
  const date = dateValue(value);
  return date
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
    : "Next monthly cycle";
}

const QUICK_START = [
  {
    number: "01",
    title: "Prepare your resume",
    body: "Build or refine the resume Replysis uses to personalize your answers.",
    href: "/resume",
    cta: "Open resume workspace",
    icon: FileText,
  },
  {
    number: "02",
    title: "Practice safely",
    body: "Run a realistic mock interview and learn where your answers can improve.",
    href: "/mock-interview",
    cta: "Start mock practice",
    icon: MessageCircleQuestion,
  },
  {
    number: "03",
    title: "Go into an interview",
    body: "Set up the live copilot with your role, company, and prepared resume.",
    href: "/real-interview",
    cta: "Set up live copilot",
    icon: Mic2,
  },
] as const;

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [billingReturned, setBillingReturned] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("billing") !== "returned") return;
    setBillingReturned(true);
    url.searchParams.delete("billing");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? (snapshot.data() as AccountProfile) : null);
        setProfileLoading(false);
      },
      () => {
        setProfile(null);
        setProfileLoading(false);
      },
    );
  }, [authLoading, user]);

  const plan = profile?.plan && profile.plan in PLAN_MONTHLY_CREDITS ? profile.plan : "free";
  const activePlan = plan === "pro" || plan === "max" ? plan : "free";
  const planFacts = plan === "lifetime"
    ? { label: "Legacy Lifetime", summary: "5,000 credits each month" }
    : plan === "teams"
      ? { label: "Legacy Teams", summary: "10,000 credits each month" }
      : PUBLIC_PLAN_CAPACITY[activePlan];
  const credits = Math.max(0, Number(profile?.credits ?? 0));
  const cap = PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
  const percentage = Math.max(0, Math.min(100, Math.round((Math.min(credits, cap) / cap) * 100)));
  const hasBillingAccount = typeof profile?.stripeCustomerId === "string" && profile.stripeCustomerId.startsWith("cus_");
  const isPaid = plan !== "free";
  const paymentNeedsAttention = Boolean(profile?.lastPaymentFailedAt);
  const isCanceling = Boolean(profile?.stripeCancelAtPeriodEnd);
  const billingStatus = useMemo(() => {
    if (paymentNeedsAttention) return { label: "Payment needs attention", tone: "amber" } as const;
    if (isCanceling) return { label: "Cancels at period end", tone: "amber" } as const;
    if (isPaid) return { label: "Active", tone: "green" } as const;
    return { label: "Free plan", tone: "gray" } as const;
  }, [isCanceling, isPaid, paymentNeedsAttention]);

  async function openBillingPortal() {
    if (!user || portalLoading) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(data.error || "Billing management is temporarily unavailable.");
      }
      window.location.assign(data.url);
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : "Billing management is temporarily unavailable.");
      setPortalLoading(false);
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8f5]">
        <PageHeader />
        <div className="flex min-h-[65vh] items-center justify-center" role="status" aria-live="polite">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#1C7A3E]" /> Loading your account…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-slate-950">
      <PageHeader />

      <section className="border-b border-emerald-950/5 bg-[radial-gradient(circle_at_top_left,_rgba(68,159,91,0.15),_transparent_36%),linear-gradient(180deg,#fbfdf9,#f7f8f5)]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#267b42] shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" /> Account center
              </div>
              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">Your Replysis workspace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                See your plan and credits, manage billing securely, and choose the clearest next step.
              </p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Signed in as</p>
              <p className="mt-1 max-w-[18rem] truncate text-sm font-bold text-slate-800">{user?.email ?? profile?.email ?? "Replysis user"}</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 pb-20 sm:px-6 sm:py-10">
        {billingReturned && (
          <section role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <h2 className="text-sm font-black">Billing management completed</h2>
              <p className="mt-1 text-sm text-emerald-900/75">Any plan or payment change will appear here as soon as Stripe confirms it.</p>
            </div>
          </section>
        )}

        {paymentNeedsAttention && (
          <section role="alert" className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h2 className="text-sm font-black text-amber-950">Your latest payment needs attention</h2>
                <p className="mt-1 text-sm leading-5 text-amber-900/75">Stripe may retry automatically. Update your payment method to avoid losing paid access.</p>
              </div>
            </div>
            <button onClick={openBillingPortal} className="rounded-xl bg-amber-950 px-4 py-2.5 text-sm font-bold text-white">Update payment</button>
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-[26px] border border-emerald-950/10 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <div className="h-1.5 bg-gradient-to-r from-[#176533] via-[#2f944e] to-[#68b874]" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current plan</p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <h2 className="text-3xl font-black tracking-tight">{planFacts.label}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                      billingStatus.tone === "green" ? "bg-emerald-100 text-emerald-800" : billingStatus.tone === "amber" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"
                    }`}>{billingStatus.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{planFacts.summary}. Credits refresh automatically and never create extra charges.</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#1C7A3E]">
                  <BadgeCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Credits remaining</p>
                    <p className="mt-1 text-3xl font-black tracking-tight">{credits.toLocaleString()} <span className="text-sm font-semibold text-slate-400">/ {cap.toLocaleString()}</span></p>
                  </div>
                  <span className="text-sm font-black text-[#267b42]">{percentage}% left</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#1C7A3E] to-[#68b874] transition-[width] duration-500" style={{ width: `${percentage}%` }} />
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <RefreshCw className="h-3.5 w-3.5" /> Refreshes {formatDate(profile?.creditsResetDate)}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {isPaid ? (
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={portalLoading || !hasBillingAccount}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C7A3E] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#176533] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {portalLoading ? "Opening secure billing…" : "Manage plan and billing"}
                  </button>
                ) : (
                  <Link href="/pricing" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C7A3E] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#176533]">
                    Compare paid plans <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/50">
                  View plan details
                </Link>
              </div>
              {isPaid && (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-[#267b42]" /> Payments, invoices, plan changes, and cancellation are handled securely by Stripe.</p>
              )}
              {isPaid && !hasBillingAccount && (
                <p role="status" className="mt-3 text-xs font-semibold text-amber-700">Your billing account is still syncing. Refresh in a moment or contact support if this continues.</p>
              )}
              {portalError && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{portalError}</p>}
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-[#101711] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.15)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">Billing clarity</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Nothing hidden</h2>
              </div>
              <CreditCard className="h-6 w-6 text-emerald-300" />
            </div>
            <div className="mt-7 space-y-4">
              {[
                [History, "Invoices", hasBillingAccount ? "Available in your secure Stripe portal" : "Created after your first paid checkout"],
                [CalendarClock, "Subscription", isCanceling ? `Access continues until ${formatDate(profile?.stripeCurrentPeriodEnd)}` : isPaid ? "Renews according to your selected billing period" : "No active paid subscription"],
                [ShieldCheck, "Payment details", "Stored and processed by Stripe—not Replysis"],
              ].map(([Icon, label, value]) => {
                const ItemIcon = Icon as typeof History;
                return (
                  <div key={String(label)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-white/55">{String(label)}</p>
                      <p className="mt-1 text-sm leading-5 text-white/85">{String(value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <a href="mailto:support@replysis.com" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200">
              Need help? Contact support <ArrowRight className="h-4 w-4" />
            </a>
          </section>
        </div>

        <section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#267b42]">Quick start</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Three simple steps—no guessing</h2>
              <p className="mt-2 text-sm text-slate-600">Use this order for the strongest first Replysis experience.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Sparkles className="h-4 w-4 text-[#267b42]" /> Start anywhere; your work stays in your account.</div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {QUICK_START.map((step) => {
              const Icon = step.icon;
              return (
                <Link key={step.number} href={step.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black tracking-[0.16em] text-slate-400">STEP {step.number}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#1C7A3E] transition group-hover:bg-[#1C7A3E] group-hover:text-white"><Icon className="h-5 w-5" /></span>
                  </div>
                  <h3 className="mt-5 text-lg font-black tracking-tight">{step.title}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-5 text-slate-600">{step.body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#267b42]">{step.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 rounded-[26px] border border-emerald-950/10 bg-white p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#1C7A3E]"><UserRound className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">Account details</h2>
              <p className="mt-1 text-sm text-slate-600">{profile?.displayName || user?.displayName || "Replysis user"} · {user?.email || profile?.email}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Check className="h-3.5 w-3.5 text-[#267b42]" /> Your sign-in and payment information are protected separately.</p>
            </div>
          </div>
          <a href="mailto:support@replysis.com" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <BriefcaseBusiness className="h-4 w-4" /> Contact support
          </a>
        </section>
      </main>
    </div>
  );
}
