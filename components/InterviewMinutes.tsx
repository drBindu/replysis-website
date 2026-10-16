"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { User } from "firebase/auth";
import {
  AUTO_ADD_MINUTES, MAX_MINUTES, MIN_MINUTES, MINUTE_STEP, RUPEES_PER_MINUTE, rupeesFor,
} from "../data/interviewMinutes";

type Status = { minutesBalance: number; autoAdd: boolean; savedCard: boolean };

/**
 * Pay by the minute, India only (owner, 2026-10-16): Rs 5 a minute, any amount from 15 to 600 minutes,
 * chosen with a slider, with an auto add switch for when the minutes run out.
 *
 * On the pricing page it sits under the plans. In the account it also shows the minutes left and the
 * switch, which works there for anyone who already has a saved card. The server decides the country
 * again at checkout; this only decides what is shown.
 */
export default function InterviewMinutes({ user, where, onNeedSignIn }: {
  user: User | null;
  where: "pricing" | "account";
  onNeedSignIn?: () => void;
}) {
  const [india, setIndia] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [autoAdd, setAutoAdd] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (new URLSearchParams(window.location.search).get("preview") === "india") { setIndia(true); return; }
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.country === "IN") setIndia(true); })
      .catch(() => { /* not shown, the safe default */ });
    return () => { cancelled = true; };
  }, []);

  const loadStatus = useCallback(async () => {
    if (!user) { setStatus(null); return; }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/minutes", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const s = (await res.json()) as Status;
        setStatus(s);
        if (s.savedCard) setAutoAdd(s.autoAdd);
      }
    } catch { /* the card still works without it */ }
  }, [user]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const hasMinutes = Boolean(status && (status.minutesBalance > 0 || status.savedCard));
  if (!india && !(where === "account" && hasMinutes)) return null;
  if (where === "account" && !user) return null;

  const buy = async () => {
    if (!user) { onNeedSignIn?.(); return; }
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ minutes, autoAdd, uid: user.uid }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) { window.location.href = data.url; return; }
      setError(res.status === 429
        ? "Too many attempts. Please wait a moment and try again."
        : res.status === 403
          ? "Minutes are available in India only."
          : "We could not start checkout. You have not been charged. Please try again.");
    } catch {
      setError("We could not reach checkout. You have not been charged. Please try again.");
    }
    setLoading(false);
  };

  // In the account, with a saved card, the switch changes the setting straight away.
  const toggleAutoAdd = async () => {
    const next = !autoAdd;
    if (!user || !status?.savedCard) { setAutoAdd(next); return; }
    setSaving(true);
    setNote(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ autoAdd: next }),
      });
      if (res.ok) {
        setAutoAdd(next);
        setNote(next ? "Auto add is on." : "Auto add is off.");
      } else setNote("That did not save. Please try again.");
    } catch { setNote("That did not save. Please try again."); }
    setSaving(false);
  };

  const pct = ((minutes - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES)) * 100;
  const hours = minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : null;

  return (
    <section id="interview-minutes"
      className="scroll-mt-24 rounded-[26px] border border-emerald-900/10 bg-white p-6 shadow-[0_12px_40px_rgba(20,60,34,0.06)] sm:p-8"
      style={where === "pricing" ? { maxWidth: 760, margin: "0 auto" } : undefined}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Pay by the minute</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            ₹{RUPEES_PER_MINUTE} for every minute the interviewer speaks. Answers inside your minutes are included.
            No subscription.
          </p>
        </div>
        {status && status.minutesBalance > 0 && (
          <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-[#1C7A3E]">
            {status.minutesBalance} {status.minutesBalance === 1 ? "minute" : "minutes"} left
          </p>
        )}
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
            {minutes} <span className="text-lg font-bold text-slate-500">minutes</span>
            {hours && <span className="ml-2 text-sm font-semibold text-slate-400">({hours})</span>}
          </p>
          <p className="text-3xl font-black tracking-tight text-[#1C7A3E] tabular-nums">₹{rupeesFor(minutes).toLocaleString("en-IN")}</p>
        </div>
        <input
          type="range"
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={MINUTE_STEP}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Minutes to buy"
          className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full accent-[#1C7A3E]"
          style={{ background: `linear-gradient(to right, #1C7A3E ${pct}%, #E5E7EB ${pct}%)` }}
        />
        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400 tabular-nums">
          <span>{MIN_MINUTES} min</span>
          <span>{MAX_MINUTES} min</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Add {AUTO_ADD_MINUTES} minutes automatically when I run out</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            ₹{rupeesFor(AUTO_ADD_MINUTES)} on your saved card, so an interview never stops. If your bank asks to approve it,
            Replysis shows a one tap payment instead.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoAdd}
          aria-label="Add minutes automatically"
          disabled={saving}
          onClick={toggleAutoAdd}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C7A3E] focus-visible:ring-offset-2 ${autoAdd ? "bg-[#1C7A3E]" : "bg-slate-300"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${autoAdd ? "left-6" : "left-1"}`} />
        </button>
      </div>
      {note && <p className="mt-2 text-xs font-semibold text-slate-500">{note}</p>}

      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-[#1C7A3E] py-3 text-sm font-black text-white transition hover:bg-[#176533] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {loading
          ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirecting</span>
          : `Buy ${minutes} minutes for ₹${rupeesFor(minutes).toLocaleString("en-IN")}`}
      </button>
      {autoAdd && !status?.savedCard && (
        <p className="mt-2 text-center text-xs text-slate-500">Pay by card to use auto add. UPI works too, without auto add.</p>
      )}
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}
