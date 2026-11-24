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
  kind: "answer" | "screen" | "refund" | "resume" | "mock" | "listen" | "signup" | "download" | "error" | "alert";
  at: number;
  who: string | null;
  detail: string;
  more?: string;
  credits?: number;
  app?: "windows" | "mac" | "android" | "ios";
};

type AppKind = "windows" | "mac" | "android" | "ios" | "app" | "web";

type OnlineUser = {
  id: string; email: string | null; plan: string;
  lastActive: number | null; listening: boolean;
  where: Array<{ app: AppKind; version: string }>;
  openedAt?: number | null; lastListeningAt?: number | null;
};

type LeftUser = {
  id: string; email: string | null; plan: string; app: AppKind; version: string;
  leftAt: number; openedAt: number | null; lastListeningAt: number | null;
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
  left?: LeftUser[];
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

// Which app a person has open. Colour is only a hint; the word is always there.
const APP_LOOK: Record<AppKind, { label: string; tone: string }> = {
  windows: { label: "Windows",            tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]" },
  mac:     { label: "Mac",                tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]" },
  android: { label: "Android phone",      tone: "border-[#BFD6C5] bg-[#EAF2EC] text-[#2F6B4F]" },
  ios:     { label: "iPhone",             tone: "border-[#BFD6C5] bg-[#EAF2EC] text-[#2F6B4F]" },
  app:     { label: "App, older version", tone: "border-[#D6D0C4] bg-[#ECE8DF] text-[#3D3B35]" },
  web:     { label: "Website",            tone: "border-[#E3DED3] bg-[#F1EEE7] text-[#5E5A51]" },
};

type Filter = "all" | "answers" | "screens" | "phone" | "people" | "problems";
const FILTERS: Array<[Filter, string, (e: LiveEvent) => boolean]> = [
  ["all",      "Everything",   () => true],
  ["answers",  "Answers",      (e) => e.kind === "answer"],
  ["screens",  "Screen reads", (e) => e.kind === "screen"],
  ["phone",    "Phone app",    (e) => e.app === "android" || e.app === "ios"],
  ["people",   "People",       (e) => e.kind === "signup" || e.kind === "download"],
  ["problems", "Problems",     (e) => e.kind === "error" || e.kind === "refund" || e.kind === "alert"],
];

const KIND: Record<LiveEvent["kind"], { label: string; tone: string; Icon: LucideIcon }> = {
  answer:   { label: "Answer",       tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]",             Icon: MessageSquare },
  screen:   { label: "Screen read",  tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]",    Icon: ImageIcon },
  refund:   { label: "Refunded",     tone: "border-[#E5D3AE] bg-[#F6EEDC] text-[#8A5A12]",       Icon: RotateCcw },
  resume:   { label: "Resume tool",  tone: "border-[#D6D0C4] bg-[#ECE8DF] text-[#3D3B35]",          Icon: MessageSquare },
  mock:     { label: "Mock interview", tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]",       Icon: MessageSquare },
  listen:   { label: "Listening",    tone: "border-[#D3DAD3] bg-[#ECEFEA] text-[#4B5A55]",             Icon: MessageSquare },
  signup:   { label: "New account",  tone: "border-[#BFD6C5] bg-[#EAF2EC] text-[#2F6B4F]", Icon: UserPlus },
  download: { label: "Download",     tone: "border-[#BFD6C5] bg-[#EAF2EC] text-[#2F6B4F]", Icon: Download },
  error:    { label: "App problem",  tone: "border-[#E7C4BC] bg-[#F7E6E2] text-[#A33A2B]",          Icon: AlertTriangle },
  alert:    { label: "Alert",        tone: "border-[#E7C4BC] bg-[#F7E6E2] text-[#A33A2B]",          Icon: AlertTriangle },
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

/** "11:00 PM" in the viewer's own time. */
function shortClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "2 h 15 min", "40 min", "under a minute". */
function span(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000);
  if (m < 1) return "under a minute";
  const h = Math.floor(m / 60);
  return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
}

/** What they did with this opening: listened, or never pressed Start (owner, 2026-10-23: "is she stuck?"). */
function startNote(openedAt: number | null | undefined, lastListeningAt: number | null | undefined, listening: boolean): string {
  if (listening) return "";
  if (!openedAt) return "";
  return lastListeningAt && lastListeningAt >= openedAt ? `, last listened ${shortClock(lastListeningAt)}` : ", has not pressed Start";
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
  const color = tone === "good" ? "text-[#2F6B4F]" : tone === "warn" ? "text-[#8A5A12]"
    : tone === "bad" ? "text-[#A33A2B]" : "text-[#1F1E1B]";
  return (
    <div className="rounded-lg border border-[#E3DED3] bg-[#F1EEE7] px-3 py-2.5">
      <div className="text-[10px] font-semibold text-[#7A756A]">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub ? <div className="text-[10px] text-[#9A9487]">{sub}</div> : null}
    </div>
  );
}

const STATE_LOOK: Record<PartState | "unknown", { dot: string; label: string; text: string }> = {
  awake:    { dot: "bg-[#2F6B4F]", label: "Awake",     text: "text-[#2F6B4F]" },
  slow:     { dot: "bg-[#C08A2E]",   label: "Slow",      text: "text-[#8A5A12]" },
  down:     { dot: "bg-[#A33A2B]",    label: "Down",      text: "text-[#A33A2B]" },
  starting: { dot: "bg-[#A39C8E]",    label: "Starting",  text: "text-[#5E5A51]" },
  unknown:  { dot: "bg-[#B9B2A4]",    label: "Checking",  text: "text-[#5E5A51]" },
};

/** One line that says whether the product is awake, and what each part took the last time it was checked. */
function SystemsStrip({ systems }: { systems: Systems | undefined }) {
  const overall = overallState(systems);
  const look = STATE_LOOK[overall];
  const ok = systems && systems.reachable ? systems : null;
  return (
    <div className="mb-4 rounded-lg border border-[#E3DED3] bg-[#F4F1EA] px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${look.dot}`} />
          <span className={look.text}>{look.label}</span>
        </span>
        <span className="text-[11px] text-[#7A756A]">
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
              <div className="flex items-center gap-2 text-xs text-[#3D3B35]">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${l.dot}`} />
                <span className="truncate">{label}</span>
              </div>
              <div className="ml-4 text-[10px] text-[#9A9487]">
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
  const [left, setLeft] = useState<LeftUser[]>([]);
  const [listeningNow, setListeningNow] = useState(0);
  const [systems, setSystems] = useState<Systems | undefined>(undefined);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<Filter>("all");
  const [testNote, setTestNote] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

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
            setLeft(Array.isArray(data.left) ? data.left : []);
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

  // Listening first, then whoever was seen most recently.
  const people = useMemo(
    () => [...online].sort((a, b) => Number(b.listening) - Number(a.listening) || (b.lastActive ?? 0) - (a.lastActive ?? 0)),
    [online],
  );
  const byApp = useMemo(() => {
    const n = { windows: 0, mac: 0, android: 0, ios: 0, app: 0, web: 0 } as Record<AppKind, number>;
    for (const u of online) for (const w of u.where) n[w.app] += 1;
    return n;
  }, [online]);
  const appSummary = (["windows", "mac", "android", "ios", "app", "web"] as AppKind[])
    .filter((k) => byApp[k] > 0)
    .map((k) => `${byApp[k]} ${k === "app" ? "older app" : APP_LOOK[k].label}`)
    .join(", ");

  const activeFilter = FILTERS.find(([key]) => key === filter) ?? FILTERS[0];
  const shown = useMemo(() => events.filter(activeFilter[2]), [events, activeFilter]);

  const live = !paused && !error && lastOk !== null && now - lastOk < POLL_MS * 3;

  // Asks the server to email the owner one test message, so "alerts reach me" is something that was seen, not assumed.
  async function sendTestAlert() {
    setTesting(true);
    setTestNote(null);
    try {
      const token = getToken ? await getToken() : (await auth.currentUser?.getIdToken()) ?? null;
      const res = await fetch("/api/v1/alerts/test", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 401 || res.status === 403) { setTestNote("Only the owner account can send a test alert. Sign in with it and try again."); return; }
      if (!res.ok) { setTestNote(`The server did not accept it (${res.status}). Try again in a minute.`); return; }
      const out = await res.json() as { configured?: boolean; emailed?: boolean; to?: string };
      if (!out.configured) setTestNote("Not set up yet: the server has no email key. Alerts are still recorded here, but nothing is emailed until it is added.");
      else if (!out.emailed) setTestNote("The mail service did not take it. The server log says why.");
      else setTestNote(`Sent to ${out.to}. If it does not arrive in a minute, look in spam.`);
    } catch {
      setTestNote("Could not reach the server. Try again.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#E3DED3] bg-[#FBFAF6] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              {live ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2F6B4F] opacity-60" /> : null}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-[#2F6B4F]" : "bg-[#B9B2A4]"}`} />
            </span>
            Live
          </h2>
          <p className="mt-0.5 text-[11px] text-[#7A756A]">
            {paused ? "Paused." : "Updates every few seconds while this page is open and in front."}
            {lastOk ? ` Last update ${ago(lastOk, now)}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sendTestAlert}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-lg border border-[#E3DED3] bg-[#F1EEE7] px-3 py-1.5 text-xs font-medium text-[#3D3B35] transition hover:text-[#1F1E1B] disabled:opacity-50">
            <AlertTriangle size={12} />
            {testing ? "Sending" : "Send me a test alert"}
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg border border-[#E3DED3] bg-[#F1EEE7] px-3 py-1.5 text-xs font-medium text-[#3D3B35] transition hover:text-[#1F1E1B]">
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
      {testNote ? (
        <div role="status" className="mb-3 rounded-lg border border-[#E3DED3] bg-[#F1EEE7] px-3 py-2 text-[11px] text-[#3D3B35]">{testNote}</div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-lg border border-[#E5D3AE] bg-[#F6EEDC] px-3 py-2 text-[11px] text-[#8A5A12]">
          The live feed could not update: {error}. It keeps trying.
        </div>
      ) : null}
      {problems.length > 0 ? (
        <div className="mb-3 rounded-lg border border-[#E5D3AE] bg-[#F6EEDC] px-3 py-2 text-[11px] text-[#8A5A12]">
          Not available right now: {problems.join(", ")}. Everything else is live.
        </div>
      ) : null}

      <SystemsStrip systems={systems} />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Chip label="People here" value={online.length >= 40 ? "40+" : online.length} tone={online.length > 0 ? "good" : "plain"} sub={appSummary || "nobody right now"} />
        <Chip label="Listening" value={listeningNow} tone={listeningNow > 0 ? "good" : "plain"} sub="mic live" />
        <Chip label="Answers" value={recent.answers} sub="last 5 min" />
        <Chip label="Screen reads" value={recent.screens} sub="last 5 min" />
        <Chip label="Refunds" value={recent.refunds} tone={recent.refunds > 0 ? "warn" : "plain"} sub="last 5 min" />
        <Chip label="App problems" value={recent.errors} tone={recent.errors > 0 ? "bad" : "plain"} sub="last 5 min" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 rounded-lg border border-[#E3DED3] bg-[#F4F1EA] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#E3DED3] px-3 py-2 text-[10px] font-semibold text-[#7A756A]">
            <span>Who is here</span>
            <span className="normal-case tracking-normal text-[#9A9487]">{online.length} open</span>
          </div>
          <ul className="max-h-[28rem] divide-y divide-[#ECE8DF] overflow-y-auto">
            {people.length === 0 ? (
              <li className="px-3 py-6 text-center text-[11px] text-[#9A9487]">Nobody has the app or the website open right now.</li>
            ) : people.map((u) => {
              return (
                <li key={u.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs text-[#2B2A26]">{u.email ?? u.id.slice(0, 8)}</span>
                    <span className={`shrink-0 text-[10px] font-medium ${u.listening ? "text-[#2F6B4F]" : "text-[#7A756A]"}`}>
                      {u.listening ? "Listening" : "Open"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {u.where.map((w) => (
                      <span key={w.app} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${APP_LOOK[w.app].tone}`}>
                        {APP_LOOK[w.app].label}{w.version ? ` ${w.version}` : ""}
                      </span>
                    ))}
                    <span className="text-[10px] text-[#9A9487]">{u.plan}, seen {ago(u.lastActive, now)}</span>
                  </div>
                  {u.openedAt ? (
                    <p className="mt-1 text-[10px] text-[#7A756A]">
                      Opened {shortClock(u.openedAt)}, open {span(now - u.openedAt)}{startNote(u.openedAt, u.lastListeningAt, u.listening)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {left.length > 0 && (
            <>
              <div className="flex items-center justify-between border-y border-[#E3DED3] px-3 py-2 text-[10px] font-semibold text-[#7A756A]">
                <span>Recently left</span>
                <span className="normal-case tracking-normal text-[#9A9487]">last 12 hours</span>
              </div>
              <ul className="max-h-[20rem] divide-y divide-[#ECE8DF] overflow-y-auto">
                {left.map((u) => (
                  <li key={u.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs text-[#5E5A51]">{u.email ?? u.id.slice(0, 8)}</span>
                      <span className="shrink-0 text-[10px] text-[#7A756A]">Left {shortClock(u.leftAt)}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#9A9487]">
                      {APP_LOOK[u.app].label}{u.version ? ` ${u.version}` : ""}, {u.plan}
                      {u.openedAt ? `, opened ${shortClock(u.openedAt)}, was open ${span(u.leftAt - u.openedAt)}` : ""}
                      {startNote(u.openedAt, u.lastListeningAt, false)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-[#E3DED3] bg-[#F4F1EA] lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3DED3] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7A756A]">
              <Activity size={11} /> What just happened
            </span>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter what just happened">
              {FILTERS.map(([key, label, test]) => {
                const count = events.filter(test).length;
                return (
                  <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                      filter === key ? "bg-[#ECE8DF] text-[#1F1E1B]" : "text-[#7A756A] hover:text-[#1F1E1B]"}`}>
                    {label}{count > 0 ? ` ${count}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <ul className="max-h-[28rem] divide-y divide-[#ECE8DF] overflow-y-auto">
            {shown.length === 0 ? (
              <li className="px-3 py-8 text-center text-[11px] text-[#9A9487]">
                {events.length === 0
                  ? "Nothing in the last 30 minutes. New activity appears here the moment it happens."
                  : `Nothing under ${activeFilter[1]} yet.`}
              </li>
            ) : shown.map((e) => {
              const k = KIND[e.kind];
              const fresh = now - e.at < FRESH_MS;
              return (
                <li key={e.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors sm:flex-nowrap ${fresh ? "bg-[#EAF2EC]" : ""}`}>
                  <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-[#7A756A] sm:w-[78px]">{clock(e.at)}</span>
                  <span className={`flex w-[104px] shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${k.tone}`}>
                    <k.Icon size={10} />{k.label}
                  </span>
                  <span className="min-w-0 basis-full truncate text-xs text-[#3D3B35] sm:flex-1 sm:basis-0">
                    {e.who ? <span className="text-[#2B2A26]">{e.who}</span> : null}
                    {e.app ? <span className="ml-2 text-[10px] text-[#7A756A]">{APP_LOOK[e.app].label}</span> : null}
                    {e.detail ? <span className="ml-2 text-[#7A756A]">{e.detail}</span> : null}
                    {e.more ? (
                      <details className="mt-1 ml-2">
                        <summary className="cursor-pointer text-[11px] text-[#7A756A] hover:text-[#1F1E1B]">What the app saw</summary>
                        <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-[#EDE9E0] p-2 text-[11px] leading-snug text-[#5E5A51]">{e.more.split(" | ").join(String.fromCharCode(10))}</pre>
                      </details>
                    ) : null}
                  </span>
                  {typeof e.credits === "number" && e.credits !== 0 ? (
                    <span className={`shrink-0 text-[11px] tabular-nums ${e.credits < 0 ? "text-[#8A5A12]" : "text-[#7A756A]"}`}>
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
