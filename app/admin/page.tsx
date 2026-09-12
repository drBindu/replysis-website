"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Shield, Users, Activity, Clock, Trash2, Check, X, Monitor, Apple,
  RefreshCw, Search, ChevronDown, ChevronRight, LogIn, CreditCard,
  Image as ImageIcon, MessageSquare, AlertTriangle, TrendingUp,
} from "lucide-react";
import { PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_AUDIO_MINUTES } from "../../data/productFacts";
import { MODEL_RATES, ratesConfigured, tokenCost, sttCost } from "../../data/providerRates";

// A user counts as online if their last heartbeat was within this window. The
// client beats every 60s, so 150s tolerates one missed beat.
const ONLINE_WINDOW_SECS = 150;

// What each plan bills per month. Matches the Stripe products created in
// app/api/stripe/checkout/route.ts; retired plans bill nothing on renewal.
const PLAN_PRICE_USD: Record<string, number> = {
  free: 0, pro: 29.99, max: 49.99, lifetime: 0, teams: 0, guest: 0,
};

const WINDOWS = [7, 30, 90] as const;

type AdminMetrics = {
  users: number; paidUsers: number; proUsers: number; maxUsers: number;
  liveUsers: number; totalUsageMinutes: number;
  winDownloads: number; macDownloads: number;
};

const EMPTY_METRICS: AdminMetrics = {
  users: 0, paidUsers: 0, proUsers: 0, maxUsers: 0,
  liveUsers: 0, totalUsageMinutes: 0, winDownloads: 0, macDownloads: 0,
};

type UsageRow = {
  credits: number; charged: number; refunded: number;
  events: number; refunds: number;
  promptTokens: number; completionTokens: number;
  tokensByModel: Record<string, { prompt: number; completion: number }>;
  byAction: Record<string, number>; byModel: Record<string, number>;
  lastAt: number | null; guest: boolean;
};

type UsageData = {
  window: { days: number; since: string; truncated: boolean; eventsScanned: number };
  totals: UsageRow;
  byIdentity: Record<string, UsageRow>;
  byDay: Record<string, number>;
  recent: Array<{
    identityId: string; email: string | null; guest: boolean;
    action: string; model: string; provider: string | null;
    credits: number; at: number | null;
    promptTokens?: number; completionTokens?: number;
  }>;
};

// ── Formatting ────────────────────────────────────────────────────
function toMs(ts: any): number {
  if (!ts) return 0;
  try {
    if (typeof ts === "number") return ts;
    if (ts.toDate) return ts.toDate().getTime();
    if (ts._seconds != null) return ts._seconds * 1000;
    if (ts.seconds != null) return ts.seconds * 1000;
    const d = new Date(ts).getTime();
    return isNaN(d) ? 0 : d;
  } catch { return 0; }
}

function latestMs(...values: any[]): number {
  return Math.max(0, ...values.map(toMs));
}

function timeAgo(ts: any): string {
  const ms = toMs(ts);
  if (!ms) return "never";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtTs(ts: any): string {
  const ms = toMs(ts);
  if (!ms) return "not recorded";
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtMinutes(minutes: number): string {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const num = (n: number) => n.toLocaleString("en-US");
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 === 0 ? 0 : 2 });

function planOf(user: any): string {
  return String(user?.plan || "free").toLowerCase();
}

/** 1,234,567 tokens reads better as 1.23M at a glance. */
function fmtTokens(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * What a usage row cost us, priced per model.
 *
 * Returns the money plus how much of it is unpriced, because a total that
 * silently omits an unrated model is the kind of number someone plans around.
 */
function costOf(row: UsageRow | null, listeningMinutes = 0) {
  if (!row) return { usd: 0, unpricedTokens: 0, priced: false };
  let usd = 0;
  let unpricedTokens = 0;
  let priced = false;

  for (const [model, t] of Object.entries(row.tokensByModel ?? {})) {
    const c = tokenCost(model, t.prompt, t.completion);
    if (c === null) unpricedTokens += t.prompt + t.completion;
    else { usd += c; priced = true; }
  }
  const stt = sttCost(listeningMinutes);
  if (stt !== null) { usd += stt; priced = true; }

  return { usd, unpricedTokens, priced };
}

// ── Building blocks ───────────────────────────────────────────────
function Kpi({ label, value, sub, icon, tone = "plain" }: {
  label: string; value: string; sub?: string;
  icon?: React.ReactNode; tone?: "plain" | "good" | "warn";
}) {
  const valueTone =
    tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e0e15] px-4 py-3.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${valueTone}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const key = (plan || "free").toLowerCase();
  const tone: Record<string, string> = {
    pro: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    max: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    lifetime: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    teams: "border-teal-500/30 bg-teal-500/10 text-teal-300",
    free: "border-white/10 bg-white/5 text-zinc-400",
    guest: "border-white/10 bg-white/5 text-zinc-500",
  };
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone[key] ?? tone.free}`}>
      {key}
    </span>
  );
}

/**
 * Credits charged per day.
 *
 * Deliberately not a library. It is one series of small numbers, and a chart
 * package would be a larger download than the entire page.
 */
function UsageBars({ byDay, days }: { byDay: Record<string, number>; days: number }) {
  const series = useMemo(() => {
    const out: Array<{ day: string; value: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ day: d, value: byDay[d] ?? 0 });
    }
    return out;
  }, [byDay, days]);

  const peak = Math.max(1, ...series.map((p) => p.value));
  const width = 100;
  const barW = width / series.length;

  if (!series.some((p) => p.value > 0)) {
    return (
      <div className="flex h-[72px] items-center justify-center rounded-lg border border-dashed border-white/10 text-[11px] text-zinc-600">
        No credits charged in this window
      </div>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} 30`} preserveAspectRatio="none" className="h-[72px] w-full" role="img"
           aria-label={`Credits charged per day over the last ${days} days`}>
        {series.map((p, i) => {
          const h = (p.value / peak) * 28;
          return (
            <rect key={p.day} x={i * barW + barW * 0.15} y={30 - h}
                  width={barW * 0.7} height={Math.max(h, p.value > 0 ? 0.6 : 0)}
                  rx={barW * 0.2} className="fill-sky-400/70">
              <title>{`${p.day}: ${p.value} credits`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-zinc-600">
        <span>{series[0]?.day}</span>
        <span>peak {num(peak)}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function Bd({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <span className="text-zinc-600">none</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => (
        <span key={k} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-300">
          {k} <span className="tabular-nums text-zinc-500">{num(v)}</span>
        </span>
      ))}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics>(EMPTY_METRICS);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "usage" | "credits">("recent");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function adminApi(path: string, opts?: RequestInit) {
    // Force-refresh the ID token so a stale one never reads as "not admin".
    const token = (await auth.currentUser?.getIdToken(true)) ?? "";
    return fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opts?.headers as Record<string, string> | undefined),
      },
    });
  }

  const fetchAll = useCallback(async (silent = false, cursor: string | null = null, days = windowDays) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);

      const query = new URLSearchParams({ limit: "100" });
      if (cursor) query.set("cursor", cursor);

      // Usage is a separate read and is allowed to fail on its own. A missing
      // index or an empty collection must not blank out the user table, which
      // is the part of this page that always works.
      const [listRes, usageRes] = await Promise.all([
        adminApi(`/api/admin?${query.toString()}`),
        adminApi(`/api/admin?view=usage&days=${days}`),
      ]);

      if (!listRes.ok) {
        if (listRes.status === 403) setIsAdmin(false);
        else {
          const e = await listRes.json().catch(() => ({}));
          setServerError(e.error || `Server error ${listRes.status}`);
        }
        return;
      }

      const data = await listRes.json();
      setIsAdmin(true);
      setServerError(null);
      setUsers(Array.isArray(data.users) ? data.users : []);

      const m = data.metrics || {};
      setMetrics({
        users: Number(m.users) || 0,
        paidUsers: Number(m.paidUsers) || 0,
        proUsers: Number(m.proUsers) || 0,
        maxUsers: Number(m.maxUsers) || 0,
        liveUsers: Number(m.liveUsers) || 0,
        totalUsageMinutes: Number(m.totalUsageMinutes) || 0,
        winDownloads: Number(m.winDownloads) || 0,
        macDownloads: Number(m.macDownloads) || 0,
      });
      setNextCursor(typeof data.page?.nextCursor === "string" ? data.page.nextCursor : null);

      if (usageRes.ok) {
        setUsage(await usageRes.json());
        setUsageError(null);
      } else {
        const e = await usageRes.json().catch(() => ({}));
        setUsage(null);
        setUsageError(e.error || `Usage unavailable (${usageRes.status})`);
      }

      setLastRefreshed(new Date());
    } catch (error) {
      console.error(error);
      setServerError("Unable to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [windowDays]);

  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthedEmail(user?.email ?? null);
      setAuthChecked(true);
      if (user) {
        fetchAll();
        if (poll) clearInterval(poll);
        // Two minutes. Every refresh is several Firestore reads and this page
        // is left open for hours.
        poll = setInterval(() => fetchAll(true, null), 120_000);
      } else {
        setIsAdmin(false);
        setLoading(false);
        if (poll) { clearInterval(poll); poll = null; }
      }
    });
    return () => { unsub(); if (poll) clearInterval(poll); };
  }, [fetchAll]);

  async function runAdminAction(action: string, payload: Record<string, unknown>) {
    setActionError(null);
    try {
      const response = await adminApi("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "The change could not be saved.");
      }
      return true;
    } catch (error: any) {
      setActionError(error?.message || "The change could not be saved.");
      return false;
    }
  }

  async function updatePlan(userId: string, plan: string) {
    const credits = PLAN_MONTHLY_CREDITS[plan as keyof typeof PLAN_MONTHLY_CREDITS] ?? 100;
    if (await runAdminAction("updatePlan", { userId, plan, credits })) fetchAll(true, currentCursor);
  }

  async function handleManualCredits(userId: string) {
    if (await runAdminAction("updateCredits", { userId, credits: newCreditValue })) {
      setEditingCredits(null);
      fetchAll(true, currentCursor);
    }
  }

  async function removeUser(userId: string) {
    if (await runAdminAction("deleteUser", { userId })) {
      setDeleteConfirm(null);
      fetchAll(true, currentCursor);
    }
  }

  const goToNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((h) => [...h, currentCursor]);
    setCurrentCursor(nextCursor);
    fetchAll(false, nextCursor);
  };

  const goToPreviousPage = () => {
    if (!cursorHistory.length) return;
    const previous = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((h) => h.slice(0, -1));
    setCurrentCursor(previous);
    fetchAll(false, previous);
  };

  const usageFor = useCallback(
    (id: string): UsageRow | null => usage?.byIdentity?.[id] ?? null,
    [usage],
  );

  const seenMs = (u: any) =>
    latestMs(u.lastActive, u.lastEntry, u.authLastSignIn, u.lastLoginAt, u.lastLogin, u.createdAt, u.authCreated);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = users.filter((u) =>
      !term ||
      (u.email || "").toLowerCase().includes(term) ||
      (u.id || "").toLowerCase().includes(term));

    return [...list].sort((a, b) => {
      if (sortBy === "usage") {
        return (usageFor(b.id)?.charged ?? 0) - (usageFor(a.id)?.charged ?? 0);
      }
      if (sortBy === "credits") {
        return (Number(b.credits) || 0) - (Number(a.credits) || 0);
      }
      return seenMs(b) - seenMs(a);
    });
  }, [users, search, sortBy, usageFor]);

  const mrr = metrics.proUsers * PLAN_PRICE_USD.pro + metrics.maxUsers * PLAN_PRICE_USD.max;
  const totals = usage?.totals;
  const refundRate = totals && totals.events > 0
    ? (totals.refunds / totals.events) * 100
    : 0;
  // Listening time is all-time while token cost is windowed, so the two are not
  // added together here. This is the token side only; the per-user rows add
  // that user's listening on top, where both numbers describe the same person.
  const totalCost = costOf(totals ?? null, 0);

  // ── Gates ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] text-zinc-500">
      <div className="flex items-center gap-3">
        <Shield size={20} className="animate-pulse" />
        <span className="text-sm font-medium">Loading admin</span>
      </div>
    </div>
  );

  if (serverError) return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0e15] p-7 text-center">
        <AlertTriangle size={24} className="mx-auto mb-3 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">Server error</h2>
        <p className="mt-2 break-words font-mono text-xs text-zinc-400">{serverError}</p>
        <p className="mt-3 text-xs text-zinc-500">
          Usually a Firestore quota or Firebase Admin problem, not a sign-in problem.
        </p>
        <button
          onClick={() => { setServerError(null); setLoading(true); fetchAll(); }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0e15] p-7 text-center">
        <Shield size={24} className="mx-auto mb-3 text-red-400" />
        <h2 className="text-lg font-semibold text-white">Access restricted</h2>
        {authedEmail ? (
          <>
            <p className="mt-2 text-sm text-zinc-400">
              Signed in as <span className="font-medium text-zinc-200">{authedEmail}</span>, which is not the admin account.
            </p>
            <button
              onClick={async () => { await signOut(auth); window.location.href = "/?auth=required&next=/admin"; }}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">
              <LogIn size={14} /> Sign out and switch account
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-400">
              {authChecked ? "Sign in with the admin account to continue." : "Checking your session"}
            </p>
            <a href="/?auth=required&next=/admin"
               className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">
              <LogIn size={14} /> Sign in as admin
            </a>
          </>
        )}
      </div>
    </div>
  );

  // ── Dashboard ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#06060a] font-sans text-white">
      <div className="mx-auto max-w-[1600px] space-y-5 p-5 lg:p-7">

        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              {num(metrics.users)} users, {num(metrics.liveUsers)} live now
              {lastRefreshed ? `, updated ${timeAgo(lastRefreshed)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAll(true, currentCursor)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e0e15] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        {actionError && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} aria-label="Dismiss"><X size={15} /></button>
          </div>
        )}

        {/* Money and people */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Monthly revenue" value={money(mrr)}
               sub={`${num(metrics.proUsers)} Pro, ${num(metrics.maxUsers)} Max`}
               icon={<TrendingUp size={12} />} tone={mrr > 0 ? "good" : "plain"} />
          <Kpi label="Users" value={num(metrics.users)}
               sub={`${num(metrics.paidUsers)} paying`} icon={<Users size={12} />} />
          <Kpi label="Live now" value={num(metrics.liveUsers)}
               sub={`within ${ONLINE_WINDOW_SECS}s`} icon={<Activity size={12} />} />
          <Kpi label="Listening time" value={fmtMinutes(metrics.totalUsageMinutes)}
               sub="all users, all time" icon={<Clock size={12} />} />
        </section>
        <p className="-mt-2 text-[11px] text-zinc-600">
          These four are current state and all-time totals. They do not follow the
          date range below.
        </p>

        {/* Usage */}
        <section className="rounded-xl border border-white/10 bg-[#0e0e15] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Usage and charges</h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                One row per billable action. This range drives everything in this
                section and the usage columns in the table.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600">Range</span>
              <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
                {WINDOWS.map((d) => (
                  <button key={d}
                    onClick={() => { setWindowDays(d); fetchAll(true, currentCursor, d); }}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      windowDays === d ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                    {d} days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {usage?.window?.truncated && (
            <div className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              More events than can be read at once. Showing the newest{" "}
              {num(usage.window.eventsScanned)}, so totals below understate the range.
            </div>
          )}

          {usageError ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              {usageError}
            </div>
          ) : !totals || totals.events === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center">
              <p className="text-sm text-zinc-400">No usage recorded yet</p>
              <p className="mx-auto mt-1.5 max-w-lg text-[11px] leading-relaxed text-zinc-600">
                Recording starts from the backend deploy that introduced it. Charges
                made before then updated the balance on the account but were never
                written down anywhere, so they cannot be shown here. Numbers will
                fill in as answers and screen reads happen.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Credits kept" value={num(totals.credits)}
                     sub={`${num(totals.charged)} charged, ${num(totals.refunded)} refunded`}
                     icon={<CreditCard size={12} />} />
                <Kpi label="Answers" value={num(totals.byAction.answer ?? 0)}
                     sub="spoken answers generated" icon={<MessageSquare size={12} />} />
                <Kpi label="Screen reads" value={num(totals.byAction.screen ?? 0)}
                     sub="vision calls" icon={<ImageIcon size={12} />} />
                <Kpi label="Refund rate" value={`${refundRate.toFixed(1)}%`}
                     sub={`${num(totals.refunds)} of ${num(totals.events)} failed`}
                     tone={refundRate > 5 ? "warn" : "plain"}
                     icon={<AlertTriangle size={12} />} />
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Tokens in" value={fmtTokens(totals.promptTokens)}
                     sub="prompt tokens billed to us" icon={<CreditCard size={12} />} />
                <Kpi label="Tokens out" value={fmtTokens(totals.completionTokens)}
                     sub="completion tokens" icon={<CreditCard size={12} />} />
                <Kpi label="Provider cost"
                     value={ratesConfigured() ? money(totalCost.usd) : "not priced"}
                     sub={ratesConfigured()
                       ? (totalCost.unpricedTokens > 0
                           ? `${fmtTokens(totalCost.unpricedTokens)} tokens on unrated models`
                           : "at your configured rates")
                       : "set rates in data/providerRates.ts"}
                     tone={ratesConfigured() ? "plain" : "warn"}
                     icon={<TrendingUp size={12} />} />
                <Kpi label="Margin"
                     value={ratesConfigured() && totalCost.priced ? money(mrr - totalCost.usd) : "not priced"}
                     sub={ratesConfigured() && totalCost.priced
                       ? "monthly revenue less provider cost"
                       : "needs rates to calculate"}
                     tone={ratesConfigured() && totalCost.priced && mrr - totalCost.usd < 0 ? "warn" : "good"}
                     icon={<TrendingUp size={12} />} />
              </div>

              {!ratesConfigured() && (
                <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] leading-relaxed text-zinc-400">
                  Token counts above are measured, straight from the provider on every
                  request. Money is not: it has to come from a published price list.
                  Put today&apos;s rates into <code className="text-zinc-300">data/providerRates.ts</code> and
                  cost per user appears here and in the table. Until then nothing is
                  guessed.
                </div>
              )}

              <UsageBars byDay={usage!.byDay} days={windowDays} />

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">By action</div>
                  <Bd counts={totals.byAction} />
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">By model</div>
                  <Bd counts={totals.byModel} />
                </div>
              </div>
            </>
          )}
        </section>

        {/* Controls */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search by email or user id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0e0e15] py-2.5 pl-9 pr-9 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/25"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex rounded-lg border border-white/10 bg-[#0e0e15] p-0.5">
            {([["recent", "Recent"], ["usage", "Most usage"], ["credits", "Balance"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  sortBy === key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Users */}
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0e0e15]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Billed</th>
                  <th className="px-4 py-3 text-right">Used ({windowDays}d)</th>
                  <th className="px-4 py-3 text-right">Answers</th>
                  <th className="px-4 py-3 text-right">Screens</th>
                  <th className="px-4 py-3 text-right">Tokens</th>
                  <th className="px-4 py-3 text-right">Cost to us</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Listening</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={12} className="px-4 py-10 text-center text-sm text-zinc-600">
                    {search ? "No user matches that search" : "No users yet"}
                  </td></tr>
                )}
                {rows.map((user) => {
                  const plan = planOf(user);
                  const u = usageFor(user.id);
                  const allowance = PLAN_MONTHLY_CREDITS[plan as keyof typeof PLAN_MONTHLY_CREDITS] ?? 100;
                  const audioCap = PLAN_MONTHLY_AUDIO_MINUTES[plan as keyof typeof PLAN_MONTHLY_AUDIO_MINUTES] ?? 60;
                  const audioUsed = Math.round(Number(user.audioMinutesUsed) || 0);
                  const online = Date.now() - toMs(user.lastActive) < ONLINE_WINDOW_SECS * 1000;
                  const open = expandedUser === user.id;
                  const userCost = costOf(u, audioUsed);

                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        onClick={() => setExpandedUser(open ? null : user.id)}
                        className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {open ? <ChevronDown size={14} className="text-zinc-600" />
                                  : <ChevronRight size={14} className="text-zinc-600" />}
                            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${online ? "bg-emerald-400" : "bg-zinc-700"}`}
                                  title={online ? "Online" : "Offline"} />
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-medium text-zinc-200">
                                {user.email || "No email on record"}
                              </div>
                              <div className="truncate font-mono text-[10px] text-zinc-600">{user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><PlanBadge plan={plan} /></td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-300">
                          {PLAN_PRICE_USD[plan] ? `${money(PLAN_PRICE_USD[plan])}/mo` : <span className="text-zinc-600">free</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                          {u ? <span className="text-white">{num(u.charged)}</span>
                             : <span className="text-zinc-700">0</span>}
                          {u && u.refunded > 0 && (
                            <span className="ml-1 text-[10px] text-amber-400">-{num(u.refunded)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-400">
                          {num(u?.byAction.answer ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-400">
                          {num(u?.byAction.screen ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums text-zinc-400">
                          {u ? fmtTokens(u.promptTokens + u.completionTokens)
                             : <span className="text-zinc-700">0</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                          {userCost.priced
                            ? <span className={PLAN_PRICE_USD[plan] && userCost.usd > PLAN_PRICE_USD[plan]
                                ? "text-amber-300" : "text-zinc-300"}>{money(userCost.usd)}</span>
                            : <span className="text-zinc-700" title="No rate set for this user's models">
                                not priced
                              </span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingCredits === user.id ? (
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number" autoFocus value={newCreditValue}
                                onChange={(e) => setNewCreditValue(Number(e.target.value))}
                                className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-right text-xs tabular-nums text-white outline-none"
                              />
                              <button onClick={() => handleManualCredits(user.id)} aria-label="Save credits"
                                      className="rounded p-1 text-emerald-400 hover:bg-white/10"><Check size={13} /></button>
                              <button onClick={() => setEditingCredits(null)} aria-label="Cancel"
                                      className="rounded p-1 text-zinc-500 hover:bg-white/10"><X size={13} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingCredits(user.id); setNewCreditValue(Number(user.credits) || 0); }}
                              className="text-[13px] tabular-nums text-zinc-300 underline-offset-2 hover:underline">
                              {num(Number(user.credits) || 0)}
                              <span className="text-zinc-600"> / {num(allowance)}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                          <span className={audioUsed > audioCap ? "text-amber-300" : "text-zinc-400"}>
                            {fmtMinutes(audioUsed)}
                          </span>
                          <span className="text-zinc-600"> / {fmtMinutes(audioCap)}</span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-zinc-400">{timeAgo(seenMs(user))}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => removeUser(user.id)}
                                      className="rounded bg-red-500/20 px-2 py-1 text-[11px] font-medium text-red-300 hover:bg-red-500/30">
                                Delete
                              </button>
                              <button onClick={() => setDeleteConfirm(null)}
                                      className="rounded px-2 py-1 text-[11px] text-zinc-500 hover:text-white">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(user.id)} aria-label="Delete user"
                                    className="rounded p-1.5 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-white/5 bg-black/30">
                          <td colSpan={12} className="px-4 py-5">
                            <div className="grid gap-6 lg:grid-cols-3">
                              <div>
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account</div>
                                <dl className="space-y-1.5 text-[12px]">
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-zinc-500">Created</dt>
                                    <dd className="text-zinc-300">{fmtTs(user.createdAt || user.authCreated)}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-zinc-500">Last sign in</dt>
                                    <dd className="text-zinc-300">{fmtTs(user.authLastSignIn)}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-zinc-500">Sessions</dt>
                                    <dd className="tabular-nums text-zinc-300">{num(Number(user.loginCount) || 0)}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-zinc-500">Credits spent, all time</dt>
                                    <dd className="tabular-nums text-zinc-300">{num(Number(user.creditsUsed) || 0)}</dd>
                                  </div>
                                  {user.location && (
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-zinc-500">Location</dt>
                                      <dd className="text-zinc-300">{String(user.location)}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              <div>
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                  Usage, last {windowDays} days
                                </div>
                                {u ? (
                                  <div className="space-y-2.5 text-[12px]">
                                    <div className="flex justify-between gap-4">
                                      <span className="text-zinc-500">Credits kept</span>
                                      <span className="tabular-nums text-zinc-200">{num(u.credits)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-zinc-500">Failed and refunded</span>
                                      <span className="tabular-nums text-zinc-200">{num(u.refunds)}</span>
                                    </div>
                                    <div>
                                      <div className="mb-1 text-zinc-500">Actions</div>
                                      <Bd counts={u.byAction} />
                                    </div>
                                    <div>
                                      <div className="mb-1 text-zinc-500">Models</div>
                                      <Bd counts={u.byModel} />
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-zinc-500">Tokens in and out</span>
                                      <span className="tabular-nums text-zinc-200">
                                        {fmtTokens(u.promptTokens)} / {fmtTokens(u.completionTokens)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-zinc-500">Cost to us</span>
                                      <span className="tabular-nums text-zinc-200">
                                        {userCost.priced ? money(userCost.usd) : "rate not set"}
                                      </span>
                                    </div>
                                    {PLAN_PRICE_USD[plan] > 0 && userCost.priced && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-zinc-500">They pay / we spend</span>
                                        <span className={`tabular-nums ${
                                          userCost.usd > PLAN_PRICE_USD[plan] ? "text-amber-300" : "text-emerald-300"}`}>
                                          {money(PLAN_PRICE_USD[plan])} / {money(userCost.usd)}
                                        </span>
                                      </div>
                                    )}
                                    {Object.keys(u.tokensByModel ?? {}).length > 0 && (
                                      <div>
                                        <div className="mb-1 text-zinc-500">Tokens by model</div>
                                        <div className="space-y-0.5">
                                          {Object.entries(u.tokensByModel).map(([m, t]) => {
                                            const c = tokenCost(m, t.prompt, t.completion);
                                            return (
                                              <div key={m} className="flex justify-between gap-4 text-[11px]">
                                                <span className="truncate text-zinc-400">{m}</span>
                                                <span className="flex-shrink-0 tabular-nums text-zinc-500">
                                                  {fmtTokens(t.prompt + t.completion)}
                                                  {c === null ? "" : ` (${money(c)})`}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[12px] text-zinc-600">
                                    Nothing recorded in this window.
                                  </p>
                                )}
                              </div>

                              <div>
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Change plan</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {/* Only the plans actually sold. "lifetime" and
                                      "teams" are retired in productFacts.ts and
                                      stay resolvable for accounts that already
                                      hold one, which is why the badge and the
                                      allowance above still render them. Offering
                                      them as buttons would let a retired plan be
                                      handed out again. */}
                                  {(["free", "pro", "max"] as const).map((p) => (
                                    <button key={p} onClick={() => updatePlan(user.id, p)}
                                      className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
                                        plan === p
                                          ? "border-white/25 bg-white/10 text-white"
                                          : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                                      {p}
                                    </button>
                                  ))}
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                                  Changing the plan also resets the balance to that plan&apos;s monthly
                                  allowance. It does not change anything in Stripe.
                                </p>
                                {(plan === "lifetime" || plan === "teams") && (
                                  <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
                                    This account is on {plan}, a retired plan. It keeps working, but
                                    moving it to another plan cannot be undone from here.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <span className="text-[11px] text-zinc-600">
              Showing {num(rows.length)} of {num(metrics.users)} users
            </span>
            <div className="flex gap-2">
              <button onClick={goToPreviousPage} disabled={!cursorHistory.length}
                className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-40">
                Previous
              </button>
              <button onClick={goToNextPage} disabled={!nextCursor}
                className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Recent activity */}
        {usage && usage.recent.length > 0 && (
          <section className="rounded-xl border border-white/10 bg-[#0e0e15] p-5">
            <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
            <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
              {usage.recent.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-[12px] hover:bg-white/[0.03]">
                  <span className="w-16 flex-shrink-0 tabular-nums text-zinc-600">{timeAgo(e.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-300">
                    {e.email || <span className="font-mono text-zinc-500">{e.identityId.slice(0, 16)}</span>}
                    {e.guest && <span className="ml-1.5 text-[10px] text-zinc-600">guest</span>}
                  </span>
                  <span className="w-24 flex-shrink-0 text-zinc-400">{e.action}</span>
                  <span className="hidden w-44 flex-shrink-0 truncate text-zinc-600 sm:block">{e.model}</span>
                  <span className={`w-14 flex-shrink-0 text-right tabular-nums ${
                    e.credits < 0 ? "text-amber-400" : "text-zinc-300"}`}>
                    {e.credits > 0 ? `-${e.credits}` : `+${-e.credits}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Distribution */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Windows downloads" value={num(metrics.winDownloads)} icon={<Monitor size={12} />} />
          <Kpi label="Mac downloads" value={num(metrics.macDownloads)} icon={<Apple size={12} />} />
          <Kpi label="Free accounts" value={num(Math.max(0, metrics.users - metrics.paidUsers))} icon={<Users size={12} />} />
          <Kpi label="Conversion" value={`${metrics.users ? ((metrics.paidUsers / metrics.users) * 100).toFixed(1) : "0.0"}%`}
               sub="paying / total" icon={<TrendingUp size={12} />} />
        </section>
      </div>
    </div>
  );
}
