"use client";
import React, { useEffect, useState, useCallback } from "react";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Shield, Zap, Crown, Clock, Users, Activity,
  MapPin, Trash2, Edit3, Check, X, Monitor, Apple,
  RefreshCw, Search, ChevronDown, ChevronUp, LogIn,
} from "lucide-react";

// A user counts as "online" if their last heartbeat was within this window.
// The client sends a heartbeat every 60s, so 150s tolerates one missed beat
// while still flipping to "Offline" ~2.5 min after they actually leave.
const ONLINE_WINDOW_SECS = 150;

type AdminMetrics = {
  users: number;
  paidUsers: number;
  liveUsers: number;
  totalUsageMinutes: number;
  winDownloads: number;
  macDownloads: number;
};

const EMPTY_METRICS: AdminMetrics = {
  users: 0,
  paidUsers: 0,
  liveUsers: 0,
  totalUsageMinutes: 0,
  winDownloads: 0,
  macDownloads: 0,
};

// ── Relative time helper ─────────────────────────────────────────
function timeAgo(ts: any): string {
  if (!ts) return "—";
  try {
    let d: Date;
    if (ts.toDate)              d = ts.toDate();
    else if (ts._seconds != null) d = new Date(ts._seconds * 1000);
    else if (ts.seconds  != null) d = new Date(ts.seconds  * 1000);
    else                          d = new Date(ts);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60)   return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return "—"; }
}

// Normalize any timestamp shape (Firestore {_seconds}, ISO string, or epoch ms
// number from Firebase Auth) to epoch milliseconds. Returns 0 if unparseable.
function toMs(ts: any): number {
  if (!ts) return 0;
  try {
    if (typeof ts === "number") return ts;
    if (ts.toDate)            return ts.toDate().getTime();
    if (ts._seconds != null)  return ts._seconds * 1000;
    if (ts.seconds  != null)  return ts.seconds  * 1000;
    const d = new Date(ts).getTime();
    return isNaN(d) ? 0 : d;
  } catch { return 0; }
}

// Most recent of several timestamps (mixed shapes). 0 if none.
function latestMs(...tss: any[]): number {
  return Math.max(0, ...tss.map(toMs));
}

function fmtTs(ts: any): string {
  if (!ts) return "—";
  try {
    let d: Date;
    if (ts.toDate)              d = ts.toDate();
    else if (ts._seconds != null) d = new Date(ts._seconds * 1000);
    else if (ts.seconds  != null) d = new Date(ts.seconds  * 1000);
    else                          d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function fmtIso(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function formatTime(minutes: number) {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = "text-white", gradient }: any) {
  return (
    <div className={`relative bg-[#0d0d14] p-5 rounded-2xl border overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${gradient}`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.02] to-transparent" />
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
      </div>
      <div className={`text-2xl font-black tracking-tight ${color}`}>{value}</div>
      <div className="text-gray-500 text-[11px] font-semibold uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

// ── Plan Badge ────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const cfg: Record<string, string> = {
    pro:      "bg-zinc-800/20 text-zinc-600 border-zinc-800/30",
    max:      "bg-zinc-800/20 text-zinc-600 border-zinc-800/30",
    lifetime: "bg-zinc-800/20 text-zinc-600 border-zinc-800/30",
    teams:    "bg-zinc-800/20 text-zinc-600 border-zinc-800/30",
    free:     "bg-gray-800/50 text-gray-500 border-gray-700/50",
  };
  const key = (plan || "free").toLowerCase();
  const emoji = { pro: "👑 ", max: "👑 ", lifetime: "♾️ ", teams: "🏢 " }[key] || "";
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cfg[key] || cfg.free}`}>
      {emoji}{plan || "Free"}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function AdminPage() {
  const [users, setUsers]               = useState<any[]>([]);
  const [metrics, setMetrics]           = useState<AdminMetrics>(EMPTY_METRICS);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail]   = useState<string | null>(null);
  const [authChecked, setAuthChecked]   = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);
  const [actionError, setActionError]   = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [nextCursor, setNextCursor]     = useState<string | null>(null);

  async function adminApi(path: string, opts?: RequestInit) {
    // force-refresh the ID token so a stale/expired token never causes a
    // false "Access Restricted" for a genuinely signed-in admin.
    const token = (await auth.currentUser?.getIdToken(true)) ?? "";
    return fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(opts?.headers as Record<string, string> | undefined),
      },
    });
  }

  const fetchAll = useCallback(async (silent = false, cursor: string | null = null) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const query = new URLSearchParams({ limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const res = await adminApi(`/api/admin?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setIsAdmin(false);
        } else {
          // 500 / quota / server error — don't show "Access Restricted"
          try { const e = await res.json(); setServerError(e.error || `Server error ${res.status}`); }
          catch { setServerError(`Server error ${res.status}`); }
        }
        setLoading(false); setRefreshing(false); return;
      }
      const data = await res.json();
      setIsAdmin(true);
      setServerError(null);
      const userList: any[] = data.users || [];
      // Sort by most-recent activity of ANY kind (heartbeat, web login, or
      // desktop sign-in via Firebase Auth) so recently-active users surface.
      const seenMs = (u: any) => latestMs(
        u.lastActive, u.lastEntry, u.authLastSignIn, u.lastLoginAt, u.lastLogin, u.createdAt, u.authCreated
      );
      userList.sort((a: any, b: any) => seenMs(b) - seenMs(a));
      setUsers(userList);
      const nextMetrics = data.metrics || {};
      setMetrics({
        users: Number(nextMetrics.users) || 0,
        paidUsers: Number(nextMetrics.paidUsers) || 0,
        liveUsers: Number(nextMetrics.liveUsers) || 0,
        totalUsageMinutes: Number(nextMetrics.totalUsageMinutes) || 0,
        winDownloads: Number(nextMetrics.winDownloads) || 0,
        macDownloads: Number(nextMetrics.macDownloads) || 0,
      });
      setNextCursor(typeof data.page?.nextCursor === "string" ? data.page.nextCursor : null);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error(error);
      setServerError("Unable to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthedEmail(user?.email ?? null);
      setAuthChecked(true);
      if (user) {
        fetchAll();
        // Auto-refresh every 30s so "Live Now" and last-seen stay accurate
        if (poll) clearInterval(poll);
        poll = setInterval(() => fetchAll(true), 120000); // 2 min — reduces Firestore quota burn vs the old 30s interval
      } else {
        setIsAdmin(false); setLoading(false);
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

  async function updatePlan(userId: string, plan: string, credits: number) {
    if (await runAdminAction("updatePlan", { userId, plan, credits })) {
      fetchAll(true, currentCursor);
    }
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
    setCursorHistory((history) => [...history, currentCursor]);
    setCurrentCursor(nextCursor);
    fetchAll(false, nextCursor);
  };

  const goToPreviousPage = () => {
    if (!cursorHistory.length) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((history) => history.slice(0, -1));
    setCurrentCursor(previousCursor);
    fetchAll(false, previousCursor);
  };

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-3 text-zinc-600">
        <Shield size={28} className="animate-pulse" />
        <span className="text-lg font-bold tracking-tight animate-pulse">Loading Admin Dashboard…</span>
      </div>
      <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-zinc-900 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    </div>
  );

  // ── Server error (quota, Firebase init failure, etc.) ─────────
  if (serverError) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto p-8 bg-[#0d0d14] rounded-3xl border border-gray-800">
        <div className="w-16 h-16 bg-zinc-800/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-zinc-800" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Server Error</h2>
        <p className="text-gray-500 text-sm mb-2 font-mono text-xs break-all">{serverError}</p>
        <p className="text-gray-600 text-xs mb-6">
          This is usually a Firestore quota or Firebase Admin issue — not a sign-in problem. Try refreshing in a minute.
        </p>
        <button
          onClick={() => { setServerError(null); setLoading(true); fetchAll(); }}
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all">
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    </div>
  );

  // ── Not admin ─────────────────────────────────────────────────
  if (!isAdmin) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto p-8 bg-[#0d0d14] rounded-3xl border border-gray-800">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-red-500" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Access Restricted</h2>
        {authedEmail ? (
          <>
            <p className="text-gray-500 text-sm mb-2">
              You're signed in as <span className="text-gray-300 font-semibold">{authedEmail}</span>,
              which isn't the admin account.
            </p>
            <p className="text-gray-600 text-xs mb-6">
              Sign out and sign back in with the owner account to access the dashboard.
            </p>
            <button
              onClick={async () => { await signOut(auth); window.location.href = "/?auth=required&next=/admin"; }}
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all">
              <LogIn size={16} /> Sign out &amp; switch account
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">
              {authChecked ? "You're not signed in. Sign in with your admin account to continue."
                           : "Checking your session…"}
            </p>
            <a href="/?auth=required&next=/admin"
               className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all">
              <LogIn size={16} /> Sign In as Admin
            </a>
          </>
        )}
      </div>
    </div>
  );

  // ── Stats ─────────────────────────────────────────────────────
  const liveCount  = metrics.liveUsers;
  const proCount   = metrics.paidUsers;
  const totalMins  = metrics.totalUsageMinutes;
  const winDls     = metrics.winDownloads;
  const macDls     = metrics.macDownloads;
  const filteredUsers = users.filter(u =>
    !search || (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-zinc-800/10 rounded-xl border border-zinc-800/20">
                <Shield size={22} className="text-zinc-600" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">Admin Dashboard</h1>
            </div>
            <p className="text-gray-500 text-sm ml-12">
              {metrics.users} users · {liveCount > 0 && <span className="text-zinc-600 font-semibold">{liveCount} live now · </span>}
              {lastRefreshed && <span>Last updated {timeAgo(lastRefreshed)}</span>}
            </p>
          </div>
          <button
            onClick={() => fetchAll(true, currentCursor)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 hover:border-gray-700 transition-all text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {actionError && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-300 transition hover:text-white" aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<Users size={16} className="text-zinc-600" />}   label="Total Users"   value={metrics.users}        color="text-zinc-600"   gradient="border-zinc-800/20 hover:border-zinc-800/40" />
          <StatCard icon={<Activity size={16} className="text-zinc-600" />} label="Live Now"    value={liveCount}            color="text-zinc-600"  gradient="border-zinc-800/20 hover:border-zinc-800/40" />
          <StatCard icon={<Crown size={16} className="text-zinc-600" />}   label="Pro Members"  value={proCount}             color="text-zinc-600"  gradient="border-zinc-800/20 hover:border-zinc-800/40" />
          <StatCard icon={<Zap size={16} className="text-zinc-600" />}    label="AI Usage"     value={formatTime(totalMins)} color="text-zinc-600" gradient="border-zinc-800/20 hover:border-zinc-800/40" />
          <StatCard icon={<Monitor size={16} className="text-zinc-600" />}  label="Win Downloads" value={winDls}              color="text-zinc-600"   gradient="border-zinc-800/20 hover:border-zinc-800/40" />
          <StatCard icon={<Apple size={16} className="text-gray-300" />}    label="Mac Downloads" value={macDls}              color="text-gray-200"   gradient="border-gray-600/30 hover:border-gray-500/50" />
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Search users by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0d0d14] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-zinc-800/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-[#0d0d14] border border-gray-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800/80">
                {["User", "Location", "Activity", "Credits", "Plan", "Downloads", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <React.Fragment key={user.id}>
                  <tr
                    className={`group cursor-pointer transition-colors hover:bg-white/[0.025] ${idx < filteredUsers.length - 1 ? "border-b border-gray-800/40" : ""}`}
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  >
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {(user.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-200 leading-tight">{user.email}</div>
                          <div className="text-[10px] text-gray-700 font-mono mt-0.5 truncate max-w-[140px]">{user.id}</div>
                          {(user.loginCount || 0) > 0 && (
                            <div className="text-[9px] text-zinc-800 mt-0.5">{user.loginCount} sessions</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">
                      {user.location ? (
                        <div className="text-xs">
                          <div className="text-gray-300 font-medium flex items-center gap-1">
                            <MapPin size={9} className="text-red-500 flex-shrink-0" />
                            {user.location.city}{user.location.region ? `, ${user.location.region}` : ""}
                          </div>
                          <div className="text-gray-600 text-[10px] mt-0.5">{user.location.country}</div>
                          {user.location.ip && <div className="text-gray-800 text-[9px] font-mono mt-0.5">{user.location.ip}</div>}
                        </div>
                      ) : <span className="text-[10px] text-gray-800 italic">No data</span>}
                    </td>

                    {/* Activity */}
                    <td className="px-5 py-4">
                      {(() => {
                        const lastActiveMs = toMs(user.lastActive);
                        const isOnline = lastActiveMs > 0
                          && Date.now() >= lastActiveMs
                          && Date.now() - lastActiveMs < ONLINE_WINDOW_SECS * 1000;
                        // Most recent signal of any kind — includes desktop
                        // sign-ins (authLastSignIn) the heartbeat can't see.
                        const lastSeen = latestMs(
                          user.lastActive, user.lastEntry, user.authLastSignIn,
                          user.lastLoginAt, user.lastLogin, user.createdAt, user.authCreated
                        );
                        return (
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              isOnline ? "bg-zinc-800/10 text-zinc-600 border border-zinc-800/20" : "bg-gray-800/40 text-gray-600 border border-gray-700/30"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-zinc-600 animate-pulse" : "bg-gray-600"}`} />
                              {isOnline ? "Live" : "Offline"}
                            </span>
                            <div className="text-[10px] text-gray-600 mt-1.5">
                              {isOnline ? "active now" : timeAgo(lastSeen)}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Credits */}
                    <td className="px-5 py-4">
                      {editingCredits === user.id ? (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            className="w-16 bg-gray-900 border border-zinc-800/50 rounded-lg px-2 py-1 text-xs text-center text-white focus:outline-none focus:border-zinc-800"
                            defaultValue={user.credits || 0}
                            onChange={e => setNewCreditValue(Number(e.target.value))}
                            autoFocus
                          />
                          <button onClick={() => handleManualCredits(user.id)} className="p-1 bg-zinc-800/10 text-zinc-600 rounded-lg hover:bg-zinc-800/20 transition">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditingCredits(null)} className="p-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/c" onClick={e => e.stopPropagation()}>
                          <span className="font-mono text-sm text-zinc-600 font-bold">{user.credits ?? 0}</span>
                          <button
                            onClick={() => { setEditingCredits(user.id); setNewCreditValue(user.credits || 0); }}
                            className="opacity-0 group-hover/c:opacity-100 p-1 rounded-lg hover:bg-white/5 transition-all"
                          >
                            <Edit3 size={11} className="text-gray-500 hover:text-white" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-start gap-2">
                        <PlanBadge plan={user.plan} />
                        <select
                          value={user.plan || "free"}
                          onChange={e => {
                            const p = e.target.value;
                            // Monthly caps — must match PLAN_MONTHLY_CREDITS / PLAN_CONFIG / webhook.
                            const credits = p === "teams" ? 10000 : (p === "max" || p === "lifetime") ? 5000 : p === "pro" ? 2000 : 100;
                            updatePlan(user.id, p, credits);
                          }}
                          className="text-[10px] bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-gray-400 cursor-pointer focus:outline-none focus:border-zinc-800/50 hover:border-gray-700 transition-colors"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="max">Max</option>
                          <option value="lifetime">Lifetime</option>
                          <option value="teams">Teams</option>
                        </select>
                      </div>
                    </td>

                    {/* Downloads */}
                    <td className="px-5 py-4">
                      {(() => {
                        const userDls = Array.isArray(user.appDownloads) ? user.appDownloads : [];
                        const winDl = userDls.find((d: any) => d.os === "win");
                        const macDl = userDls.find((d: any) => d.os === "mac");
                        return (winDl || macDl) ? (
                          <div className="space-y-1">
                            {winDl && <div className="flex items-center gap-1.5 text-[10px] text-zinc-600"><Monitor size={9} />Win · {fmtIso(winDl.at)}</div>}
                            {macDl && <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><Apple size={9} />Mac · {fmtIso(macDl.at)}</div>}
                          </div>
                        ) : <span className="text-[10px] text-gray-800 italic">—</span>;
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <div className="text-[9px] text-gray-700 uppercase tracking-wide">Usage</div>
                          <div className="text-xs font-mono text-gray-400 font-semibold">{formatTime(user.realUsageMinutes)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedUser(expandedUser === user.id ? null : user.id); }}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-white transition"
                          >
                            {expandedUser === user.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => removeUser(user.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded-lg font-bold hover:bg-red-600 transition">
                                Delete
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded-lg hover:bg-gray-700 transition">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteConfirm(user.id); }}
                              className="p-1.5 bg-red-500/0 text-red-600 rounded-lg hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded login history */}
                  {expandedUser === user.id && (() => {
                    const history = Array.isArray(user.loginHistory) ? [...user.loginHistory].reverse().slice(0, 5) : [];
                    if (!history.length) return null;
                    return (
                      <tr className="bg-black/20">
                        <td colSpan={7} className="px-8 py-4 border-b border-gray-800/40">
                          <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-3">
                            <Clock size={10} /> Login History (last {history.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {history.map((entry: any, i: number) => (
                              <div key={i} className="bg-gray-900/60 border border-gray-800/60 rounded-xl px-3 py-2 text-[10px]">
                                <div className="text-gray-300 font-semibold">{fmtIso(entry.at)}</div>
                                {entry.city && (
                                  <div className="text-gray-600 flex items-center gap-1 mt-0.5">
                                    <MapPin size={7} className="text-red-600" />
                                    {entry.city}{entry.country ? `, ${entry.country}` : ""}
                                  </div>
                                )}
                                {entry.ip && <div className="text-gray-800 font-mono mt-0.5">{entry.ip}</div>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="py-20 text-center">
              <Users size={32} className="text-gray-800 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold text-sm">
                {search ? `No users matching "${search}"` : "No users found"}
              </p>
            </div>
          )}
          {(cursorHistory.length > 0 || nextCursor) && (
            <div className="flex items-center justify-between border-t border-gray-800/80 px-5 py-3">
              <span className="text-xs text-gray-500">Page {cursorHistory.length + 1}</span>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={!cursorHistory.length || refreshing}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={!nextCursor || refreshing}
                  className="rounded-lg border border-zinc-800/50 bg-zinc-800/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-800 pb-4">
          Replysis Admin · {metrics.users} users · {metrics.winDownloads + metrics.macDownloads} downloads
        </div>
      </div>
    </div>
  );
}
