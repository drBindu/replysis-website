"use client";
import { formatMoney } from "../lib/admin-metrics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../firebaseConfig";
import { RefreshCw } from "lucide-react";

// One row per person: what they did, whether Replysis worked for them, how fast, and whether they paid. The first thing
// on the admin page, because "who got answers and who got stuck" is the question every other table made hard to answer.
type Person = {
  id: string; email: string | null; internal: boolean; joined: number | null; lastSeen: number | null;
  plan: string; paid: boolean; paidInr: number; subscribed?: boolean; paidMoney?: Record<string, number>; minutesLeft: number; answersLeft: number; app: string | null;
  answers: number; screens: number; mock: number; resume: number; maya?: number; refunds: number;
  medianMs: number | null; slowest: number | null; lastAnswerAt: number | null;
  result: "got-answers" | "website-only" | "app-not-started" | "app-no-answer" | "signed-up-only";
};

const RESULT: Record<Person["result"], { label: string; tone: string; order: number }> = {
  "got-answers":    { label: "Got answers",              tone: "border-[#BFD6C5] bg-[#EAF2EC] text-[#2F6B4F]", order: 0 },
  "website-only":   { label: "Used website tools",        tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]",             order: 1 },
  "app-no-answer":  { label: "Pressed Start, no answer",  tone: "border-[#E7C4BC] bg-[#F7E6E2] text-[#A33A2B]",             order: 2 },
  "app-not-started": { label: "Opened app, never pressed Start", tone: "border-[#E5D3AE] bg-[#F6EEDC] text-[#8A5A12]", order: 2 },
  "signed-up-only": { label: "Signed up, did nothing",    tone: "border-[#D6D0C4] bg-[#ECE8DF] text-[#5E5A51]",          order: 3 },
};

const ago = (ms: number | null) => {
  if (!ms) return "never";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

function Speed({ ms }: { ms: number | null }) {
  if (ms == null) return <span className="text-[#B3AD9F]">-</span>;
  const tone = ms < 1000 ? "text-[#2F6B4F]" : ms < 2500 ? "text-[#8A5A12]" : "text-[#A33A2B]";
  const word = ms < 1000 ? "fast" : ms < 2500 ? "ok" : "slow";
  return <span className={tone}>{(ms / 1000).toFixed(1)}s <span className="text-[10px] opacity-70">{word}</span></span>;
}

// Monthly dollar prices of the subscription plans, as on the pricing page.
const USD_PLAN: Record<string, number> = { pro: 34.99, max: 79.99 };

export default function PeoplePanel() {
  const [days, setDays] = useState(7);
  const [people, setPeople] = useState<Person[]>([]);
  const [hideMine, setHideMine] = useState(true);
  // One group at a time (owner 2026-10-21: separate the people using it from the ones who signed up and did nothing).
  const [group, setGroup] = useState<Person["result"] | "all">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = (await auth.currentUser?.getIdToken()) ?? null;
      const res = await fetch(`/api/admin?view=people&days=${days}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setPeople(Array.isArray(body.people) ? body.people : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load people");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const real = useMemo(() => people.filter(p => !(hideMine && p.internal)), [people, hideMine]);
  const shown = useMemo(() => real.filter(p => group === "all" || p.result === group), [real, group]);
  const sum = useMemo(() => {
    const by = (r: Person["result"]) => real.filter(p => p.result === r).length;
    const fast = real.filter(p => p.medianMs != null);
    const allMs = fast.map(p => p.medianMs as number).sort((a, b) => a - b);
    return {
      total: real.length, got: by("got-answers"), web: by("website-only"), stuck: by("app-no-answer"), notStarted: by("app-not-started"), idle: by("signed-up-only"),
      paid: real.filter(p => p.paid).length, paidInr: real.reduce((s, p) => s + p.paidInr, 0),
      // Dollar subscriptions (Pro, Max) leave no rupee receipt, so they are priced by plan, monthly.
      money: real.reduce((all, p) => { for (const [c, v] of Object.entries(p.paidMoney ?? {})) all[c] = (all[c] ?? 0) + v; return all; }, {} as Record<string, number>),
      typicalMs: allMs.length ? allMs[Math.floor(allMs.length / 2)] : null,
    };
  }, [real]);

  return (
    <section className="rounded-xl border border-[#E3DED3] bg-[#FBFAF6] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#1F1E1B]">People</h2>
          <p className="mt-0.5 text-[12px] text-[#7A756A]">Everyone active {days === 3650 ? "ever" : days === 1 ? "today" : `in the last ${days} days`}. Click a box to see only that group.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 7, 30, 3650].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${days === d ? "bg-[#ECE8DF] text-[#1F1E1B]" : "text-[#7A756A] hover:text-[#1F1E1B]"}`}>
              {d === 1 ? "Today" : d === 3650 ? "All time" : `${d} days`}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-[11px] text-[#5E5A51]">
            <input type="checkbox" checked={hideMine} onChange={e => setHideMine(e.target.checked)} /> Hide mine and friends
          </label>
          <button onClick={() => void load()} aria-label="Refresh people" className="rounded-md p-1.5 text-[#5E5A51] hover:bg-[#ECE8DF]">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {([
          ["People", sum.total, "text-[#1F1E1B]", "all"],
          ["Using it (got answers)", sum.got, "text-[#2F6B4F]", "got-answers"],
          ["Website tools only", sum.web, "text-[#4B5A55]", "website-only"],
          ["Opened app, never pressed Start", sum.notStarted, sum.notStarted ? "text-[#8A5A12]" : "text-[#5E5A51]", "app-not-started"],
          ["Pressed Start, no answer", sum.stuck, sum.stuck ? "text-[#A33A2B]" : "text-[#5E5A51]", "app-no-answer"],
          ["Signed up, never used", sum.idle, "text-[#5E5A51]", "signed-up-only"],
          ["Paid", `${sum.paid}${formatMoney(sum.money) ? ` (${formatMoney(sum.money)})` : ""}`, sum.paid ? "text-[#2F6B4F]" : "text-[#5E5A51]", null],
          ["Typical answer speed", sum.typicalMs == null ? "-" : `${(sum.typicalMs / 1000).toFixed(1)}s`, "text-[#1F1E1B]", null],
        ] as [string, string | number, string, Person["result"] | "all" | null][]).map(([label, value, tone, g]) => (
          <button key={label} disabled={g == null} onClick={() => g && setGroup(g)}
            className={`rounded-lg border px-3 py-2 text-left transition disabled:cursor-default ${
              g != null && group === g ? "border-[#BDB6A8] bg-[#ECE8DF]" : "border-[#ECE8DF] bg-[#F4F1EA] enabled:hover:bg-[#F1EEE7]"}`}>
            <div className="text-[10px] text-[#7A756A]">{label}</div>
            <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
          </button>
        ))}
      </div>

      {error && <div className="mb-3 rounded border border-[#E7C4BC] bg-[#F7E6E2] px-3 py-2 text-[12px] text-[#8E2F22]">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#E3DED3] text-[10px] font-semibold text-[#7A756A]">
              <th className="px-3 py-2">Person</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2 text-right">Live answers</th>
              <th className="px-3 py-2 text-right">Screen</th>
              <th className="px-3 py-2 text-right">Mock / resume</th>
              <th className="px-3 py-2 text-right">Speed (typical)</th>
              <th className="px-3 py-2">App</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2 text-right">Left</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-[13px] text-[#9A9487]">{loading ? "Loading" : "Nobody in this group"}</td></tr>
            )}
            {shown.map(p => (
              <tr key={p.id} className="border-b border-[#ECE8DF] text-[12.5px]">
                <td className="px-3 py-2">
                  <div className="font-medium text-[#2B2A26]">{p.email ?? "no email"}</div>
                  {p.internal && <div className="text-[10px] text-[#9A9487]">yours or a friend</div>}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RESULT[p.result].tone}`}>{RESULT[p.result].label}</span>
                  {p.refunds > 0 && <div className="mt-0.5 text-[10px] text-[#8A5A12]">{p.refunds} failed and refunded</div>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[#3D3B35]">{p.answers || <span className="text-[#B3AD9F]">0</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[#3D3B35]">{p.screens || <span className="text-[#B3AD9F]">0</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[#5E5A51]">{p.mock + p.resume + (p.maya ?? 0) || <span className="text-[#B3AD9F]">0</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums"><Speed ms={p.medianMs} /></td>
                <td className="px-3 py-2 text-[#5E5A51]">{p.app ?? <span className="text-[#B3AD9F]">not opened</span>}</td>
                <td className="px-3 py-2">
                  {formatMoney(p.paidMoney) ? <span className="font-semibold text-[#2F6B4F]">{formatMoney(p.paidMoney)}{p.plan !== "free" ? <span className="capitalize"> {p.plan}</span> : " minutes"}</span>
                    : p.paid ? <span className="font-semibold text-[#2F6B4F]">{p.subscribed && USD_PLAN[p.plan] ? `$${USD_PLAN[p.plan]}/mo ` : ""}<span className="capitalize">{p.plan}</span></span>
                    : <span className="text-[#9A9487]">free</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[#5E5A51]">
                  {/* A paid plan answers from its plan; leftover gift minutes are not what it has left (Gowri read "1 min", 2026-10-24). */}
                  {p.minutesLeft > 0 && !(p.plan === "pro" || p.plan === "max") ? <span className="text-[#2F6B4F]">{p.minutesLeft} min</span> : `${p.answersLeft} answers`}
                </td>
                <td className="px-3 py-2 text-[#7A756A]">{ago(p.joined)}</td>
                <td className="px-3 py-2 text-[#7A756A]">{ago(p.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-[#9A9487]">
        Speed is how long the AI took to start the answer (typical per person). App problems are in the Live panel under Problems,
        with what the app saw from 1.0.41 on.
      </p>
    </section>
  );
}
