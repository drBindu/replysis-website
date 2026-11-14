"use client";
import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";

// What people did in the Mac and Windows apps (the activity diary, owner 2026-11-14). Names and numbers only: the apps never
// send what anyone said, the answers, the screen or the resume, and the server drops anything that looks like text.

type Event = { t: number; event: string; props: Record<string, unknown>; platform: string; v: string; session: string };
type Person = {
  uid: string; email: string; internal: boolean; lastAt: number; platforms: string[]; count: number; problems: number;
  events: Event[];
};
type Data = { hours: number; people: Person[]; truncated: boolean };

const RANGES = [
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: 168, label: "7 days" },
  { hours: 720, label: "30 days" },
];

const PROBLEM_EVENTS = new Set(["problem_shown", "speech_dropped", "app_crashed_previous_run", "sign_in_failed", "permission_result"]);

function when(t: number): string {
  if (!t) return "";
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function propsText(p: Record<string, unknown>): string {
  return Object.entries(p).map(([k, v]) => `${k} ${String(v)}`).join(", ");
}

function isProblem(e: Event): boolean {
  if (e.event === "permission_result") return e.props.result === "denied";
  return PROBLEM_EVENTS.has(e.event);
}

export default function ActivityPanel() {
  const [hours, setHours] = useState(48);
  const [showMine, setShowMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin?view=activity&hours=${hours}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError("");
    } catch {
      setError("Could not load app activity.");
    }
  }, [hours]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const people = (data?.people ?? []).filter((p) => showMine || !p.internal);

  return (
    <section className="rounded-xl border border-white/10 bg-[#0e0e15] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">App activity</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            What people did in the Mac and Windows apps, newest first. Never what anyone said, the answers, the screen or the resume.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <label className="flex items-center gap-1.5 text-zinc-400">
            <input type="checkbox" checked={showMine} onChange={(e) => setShowMine(e.target.checked)} />
            Include yours and friends
          </label>
          {RANGES.map((r) => (
            <button key={r.hours} onClick={() => setHours(r.hours)}
              className={`rounded-md px-2 py-1 ${hours === r.hours ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="text-[12px] text-amber-300">{error}</div> : null}
      {data && !people.length ? <div className="py-6 text-center text-[12px] text-zinc-500">No app activity in this range.</div> : null}

      <ul className="divide-y divide-white/5">
        {people.map((p) => (
          <li key={p.uid} className="py-2">
            <button onClick={() => setOpen(open === p.uid ? null : p.uid)} className="flex w-full items-center justify-between gap-3 text-left text-[12.5px]">
              <span className="truncate text-zinc-200">{p.email || p.uid}{p.internal ? " (yours)" : ""}</span>
              <span className="shrink-0 text-zinc-500">
                {p.platforms.join(", ")}, {p.count} events
                {p.problems ? <span className="text-amber-300">, {p.problems} problems</span> : null}, {when(p.lastAt)}
              </span>
            </button>
            {open === p.uid ? (
              <table className="mt-2 w-full text-[11.5px]">
                <tbody>
                  {p.events.map((e, i) => (
                    <tr key={i} className={isProblem(e) ? "text-amber-300" : "text-zinc-400"}>
                      <td className="whitespace-nowrap py-0.5 pr-3 tabular-nums">{when(e.t)}</td>
                      <td className="whitespace-nowrap pr-3">{e.platform}</td>
                      <td className="whitespace-nowrap pr-3 text-zinc-200">{e.event.replace(/_/g, " ")}</td>
                      <td className="w-full">{propsText(e.props)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </li>
        ))}
      </ul>
      {data?.truncated ? <p className="mt-2 text-[11px] text-zinc-600">Only the newest 2,000 batches are shown. Pick a shorter range.</p> : null}
    </section>
  );
}
