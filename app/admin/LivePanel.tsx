"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../firebaseConfig";
import {
  Activity, AlertTriangle, Download, Image as ImageIcon, MessageSquare,
  Pause, Play, RotateCcw, UserPlus, type LucideIcon,
} from "lucide-react";

// What the Live panel shows: everything that happens, as it happens. It asks the server for what is new since it
// last looked, every few seconds, while this page is visible, and keeps the newest few hundred rows.
const POLL_MS = 4_000;
const FIRST_LOOK_BACK_MS = 30 * 60_000;
const KEEP_EVENTS = 300;
const RECENT_MS = 5 * 60_000;
const FRESH_MS = 8_000;

export type LiveEvent = {
  id: string;
  kind: "answer" | "screen" | "refund" | "resume" | "signup" | "download" | "error";
  at: number;
  who: string | null;
  detail: string;
  credits?: number;
};

type OnlineUser = {
  id: string; email: string | null; plan: string;
  lastActive: number | null; listening: boolean;
};

type PartState = "awake" | "slow" | "down" | "starting";
type Part = { state: PartState; ms?: number; note?: string; ageMs?: number };
type Systems =
  | { reachable: false }
  | { reachable: true; roundAgeMs: number; uptimeSeconds: number; systems: Record<string, Part> };

type LiveResponse = {
  now: number;
  events: LiveEvent[];
  online: OnlineUser[];
  listeningNow: number;
  systems?: Systems;
  problems: string[];
};

// The parts an answer depends on, in the order a question uses them, named for what they do.
const PARTS: Array<[string, string]> = [
  ["answer_model", "Answers"],
  ["screen_model", "Screen reading"],
  ["database", "Accounts and credits"],
  ["speech", "Speech"],
  ["speech_backup", "Speech backup"],
  ["website", "Website"],
];

/** Awake only when every part answered recently and quickly; slow when one is late; down when one fails or the check itself has stopped. */
export function overallState(systems: Systems | undefined): PartState | "unknown" {
  if (!systems) return "unknown";
  if (!systems.reachable) return "down";
  if (systems.roundAgeMs < 0 || systems.roundAgeMs > 120_000) return "down";   // the keep-warm job has stopped
  const states = PARTS.map(([key]) => systems.systems[key]?.state ?? "starting");
  if (states.includes("down")) return "down";
  if (states.includes("slow")) return "slow";
  if (states.includes("starting")) return "starting";
  return "awake";
}

const KIND: Record<LiveEvent["kind"], { label: string; tone: string; Icon: LucideIcon }> = {
  answer:   { label: "Answer",       tone: "border-sky-500/30 bg-sky-500/10 text-sky-300",             Icon: MessageSquare },
  screen:   { label: "Screen read",  tone: "border-violet-500/30 bg-violet-500/10 text-violet-300",    Icon: ImageIcon },
  refund:   { label: "Refunded",     tone: "border-amber-500/30 bg-amber-500/10 text-amber-300",       Icon: RotateCcw },
  resume:   { label: "Resume tool",  tone: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",          Icon: MessageSquare },
  signup:   { label: "New account",  tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", Icon: UserPlus },
  download: { label: "Download",     tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", Icon: Download },
  error:    { label: "App problem",  tone: "border-rose-500/30 bg-rose-500/10 text-rose-300",          Icon: AlertTriangle },
};

/** Merges new rows into what is held: no row twice, newest first, capped. Pure so it can be checked on its own. */
export function mergeEvents(held: LiveEvent[], incoming: LiveEvent[], keep = KEEP_EVENTS): LiveEvent[] {
  if (incoming.length === 0) return held;
  const seen = new Set(held.map((e) => e.id));
  const fresh = incoming.filter((e) => !seen.has(e.id));
  if (fresh.length === 0) return held;
  return [...fresh, ...held].sort((a, b) => b.at - a.at).slice(0, keep);
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ago(ms: number | null, now: number): string {
  if (!ms) return "";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

function Chip({ label, value, tone = "plain", sub }: {
  label: string; value: number | string; tone?: "plain" | "good" | "warn" | "bad"; sub?: string;
}) {
  const color = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300"
    : tone === "bad" ? "text-rose-300" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub ? <div className="text-[10px] text-zinc-600">{sub}</div> : null}
    </div>
  );
}

const STATE_LOOK: Record<PartState | "unknown", { dot: string; label: string; text: string }> = {
  awake:    { dot: "bg-emerald-400", label: "Awake",     text: "text-emerald-300" },
  slow:     { dot: "bg-amber-400",   label: "Slow",      text: "text-amber-300" },
  down:     { dot: "bg-rose-500",    label: "Down",      text: "text-rose-300" },
  starting: { dot: "bg-zinc-500",    label: "Starting",  text: "text-zinc-400" },
  unknown:  { dot: "bg-zinc-600",    label: "Checking",  text: "text-zinc-400" },
};

/** One line that says whether the product is awake, and what each part took the last time it was checked. */
function SystemsStrip({ systems }: { systems: Systems | undefined }) {
  const overall = overallState(systems);
  const look = STATE_LOOK[overall];
  const ok = systems && systems.reachable ? systems : null;
  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${look.dot}`} />
          <span className={look.text}>{look.label}</span>
        </span>
        <span className="text-[11px] text-zinc-500">
          {overall === "awake" ? "Everything an answer needs is ready."
            : overall === "slow" ? "Working, but something is answering late."
            : overall === "down" ? (systems && !systems.reachable ? "The server is not answering." : "Something an answer needs is not working.")
            : "Waiting for the first check."}
          {ok ? ` Checked ${Math.max(0, Math.round(ok.roundAgeMs / 1000))} s ago. Up ${fmtUptime(ok.uptimeSeconds)}.` : ""}
        </span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        {PARTS.map(([key, label]) => {
          const part = ok?.systems[key];
          const state: PartState | "unknown" = part ? part.state : ok ? "starting" : "unknown";
          const l = STATE_LOOK[state];
          return (
            <li key={key} className="min-w-0" title={part?.note || undefined}>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${l.dot}`} />
                <span className="truncate">{label}</span>
              </div>
              <div className="ml-4 text-[10px] text-zinc-600">
                {part && part.state !== "starting" ? `${l.label}${part.ms ? `, ${part.ms} ms` : ""}` : l.label}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function fmtUptime(seconds: number): string {
  if (seconds < 120) return `${seconds} s`;
  if (seconds < 7_200) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172_800) return `${Math.round(seconds / 3_600)} h`;
  return `${Math.round(seconds / 86_400)} days`;
}

export default function LivePanel({ getToken }: { getToken?: () => Promise<string | null> } = {}) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [listeningNow, setListeningNow] = useState(0);
  const [systems, setSystems] = useState<Systems | undefined>(undefined);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const sinceRef = useRef<number>(Date.now() - FIRST_LOOK_BACK_MS);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // One clock for the whole panel: relative times and the "just happened" highlight.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (stopped) return;
      if (!pausedRef.current && typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          // The cached token, not a forced refresh: this runs every few seconds and the SDK renews it when needed.
          const token = getToken ? await getToken() : (await auth.currentUser?.getIdToken()) ?? null;
          if (token) {
            const res = await fetch(`/api/admin?view=live&since=${sinceRef.current}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || `Server answered ${res.status}`);
            }
            const data: LiveResponse = await res.json();
            if (stopped) return;

            setEvents((held) => mergeEvents(held, Array.isArray(data.events) ? data.events : []));
            setOnline(Array.isArray(data.online) ? data.online : []);
            setListeningNow(Number(data.listeningNow) || 0);
            setSystems(data.systems);
            setProblems(Array.isArray(data.problems) ? data.problems : []);
            setError(null);
            setLastOk(Date.now());

            // Next time ask only for what is newer than the newest row seen, with a second of overlap; rows are
            // told apart by id, so the overlap cannot show anything twice.
            const newest = (data.events ?? []).reduce((m, e) => Math.max(m, e.at), 0);
            if (newest > 0) sinceRef.current = Math.max(sinceRef.current, newest - 1_000);
            else sinceRef.current = Math.max(sinceRef.current, (data.now || Date.now()) - 60_000);
          }
        } catch (e) {
          if (!stopped) setError(e instanceof Error ? e.message : "Could not reach the server");
        }
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    }

    tick();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recent = useMemo(() => {
    const since = now - RECENT_MS;
    const count = (pred: (e: LiveEvent) => boolean) => events.filter((e) => e.at >= since && pred(e)).length;
    return {
      answers: count((e) => e.kind === "answer"),
      screens: count((e) => e.kind === "screen"),
      refunds: count((e) => e.kind === "refund"),
      errors: count((e) => e.kind === "error"),
    };
  }, [events, now]);

  const live = !paused && !error && lastOk !== null && now - lastOk < POLL_MS * 3;

  return (
    <section className="rounded-xl border border-white/10 bg-[#0e0e15] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              {live ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-400" : "bg-zinc-600"}`} />
            </span>
            Live
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {paused ? "Paused." : "Updates every few seconds while this page is open and in front."}
            {lastOk ? ` Last update ${ago(lastOk, now)}.` : ""}
          </p>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:text-white">
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          The live feed could not update: {error}. It keeps trying.
        </div>
      ) : null}
      {problems.length > 0 ? (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          Not available right now: {problems.join(", ")}. Everything else is live.
        </div>
      ) : null}

      <SystemsStrip systems={systems} />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Chip label="Online now" value={online.length >= 40 ? "40+" : online.length} tone={online.length > 0 ? "good" : "plain"} sub="apps open" />
        <Chip label="Listening" value={listeningNow} tone={listeningNow > 0 ? "good" : "plain"} sub="mic live" />
        <Chip label="Answers" value={recent.answers} sub="last 5 min" />
        <Chip label="Screen reads" value={recent.screens} sub="last 5 min" />
        <Chip label="Refunds" value={recent.refunds} tone={recent.refunds > 0 ? "warn" : "plain"} sub="last 5 min" />
        <Chip label="App problems" value={recent.errors} tone={recent.errors > 0 ? "bad" : "plain"} sub="last 5 min" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 lg:col-span-1">
          <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Who is here
          </div>
          <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {online.length === 0 ? (
              <li className="px-3 py-6 text-center text-[11px] text-zinc-600">Nobody has the app open right now.</li>
            ) : online.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs text-zinc-200">{u.email ?? u.id.slice(0, 8)}</div>
                  <div className="text-[10px] text-zinc-600">{u.plan}, {ago(u.lastActive, now)}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  u.listening
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-zinc-400"}`}>
                  {u.listening ? "Listening" : "Open"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1.5"><Activity size={11} /> What just happened</span>
            <span className="normal-case tracking-normal text-zinc-600">{events.length} in view</span>
          </div>
          <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {events.length === 0 ? (
              <li className="px-3 py-8 text-center text-[11px] text-zinc-600">
                Nothing in the last 30 minutes. New activity appears here the moment it happens.
              </li>
            ) : events.map((e) => {
              const k = KIND[e.kind];
              const fresh = now - e.at < FRESH_MS;
              return (
                <li key={e.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors sm:flex-nowrap ${fresh ? "bg-emerald-500/5" : ""}`}>
                  <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-zinc-500 sm:w-[78px]">{clock(e.at)}</span>
                  <span className={`flex w-[104px] shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${k.tone}`}>
                    <k.Icon size={10} />{k.label}
                  </span>
                  <span className="min-w-0 basis-full truncate text-xs text-zinc-300 sm:flex-1 sm:basis-0">
                    {e.who ? <span className="text-zinc-200">{e.who}</span> : null}
                    {e.detail ? <span className={`text-zinc-500 ${e.who ? "ml-2" : ""}`}>{e.detail}</span> : null}
                  </span>
                  {typeof e.credits === "number" && e.credits !== 0 ? (
                    <span className={`shrink-0 text-[11px] tabular-nums ${e.credits < 0 ? "text-amber-300" : "text-zinc-500"}`}>
                      {e.credits > 0 ? `-${e.credits}` : `+${-e.credits}`}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
