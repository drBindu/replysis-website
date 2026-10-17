"use client";
import React, { useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { Globe2, MonitorSmartphone, MousePointerClick, Users } from "lucide-react";

// Real people who opened the website, counted in their own browser. Scanners and crawlers never run the page, so
// they are not in these numbers by design.

type Row = { name: string; count: number };
type Data = {
  today: { visitors: number; pageviews: number };
  yesterday: { visitors: number; pageviews: number };
  multiPageToday: number;
  series: { day: string; visitors: number; pageviews: number }[];
  countries: Row[];
  landing: Row[];
  referrers: Row[];
  devices: { desktop: number; mobile: number };
  truncated: boolean;
};

const REFRESH_MS = 60_000;

function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code) || code === "??") return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function BarList({ rows, total, label }: { rows: Row[]; total: number; label?: (r: Row) => React.ReactNode }) {
  if (!rows.length) return <div className="py-6 text-center text-[12px] text-slate-500">Nothing yet today.</div>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = total > 0 ? Math.max(4, Math.round((r.count / total) * 100)) : 0;
        return (
          <li key={r.name}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[12.5px]">
              <span className="truncate text-slate-200">{label ? label(r) : r.name}</span>
              <span className="tabular-nums text-slate-400">{r.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300/90">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tabular-nums text-white">{value}</div>
      <div className="mt-1 text-[12px] text-slate-400">{sub}</div>
    </div>
  );
}

export default function VisitorsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const token = (await auth.currentUser?.getIdToken()) ?? "";
        const res = await fetch("/api/admin?view=visitors&days=14", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Data;
        if (alive) {
          setData(json);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const today = data?.today.visitors ?? 0;
  const yesterday = data?.yesterday.visitors ?? 0;
  const delta = today - yesterday;
  const max = Math.max(1, ...(data?.series.map((s) => s.visitors) ?? [1]));
  const devTotal = (data?.devices.desktop ?? 0) + (data?.devices.mobile ?? 0);
  const deltaText = !data ? " " : delta === 0 ? "same as yesterday" : `${delta > 0 ? "+" : ""}${delta} vs yesterday (${yesterday})`;

  return (
    <section aria-label="Website visitors" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Globe2 size={16} className="text-emerald-300" />
          <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-300">Website visitors</h2>
        </div>
        <span className="text-[11.5px] text-slate-500">Real people only. Scanners and bots are not counted. Days are Chicago time (CST).</span>
      </div>

      {error && !data ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
          Could not load visitors. Try again in a minute.
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<Users size={12} />} label="Visitors today" value={data ? today : "-"} sub={deltaText} />
            <Stat icon={<MousePointerClick size={12} />} label="Pages opened" value={data ? data.today.pageviews : "-"}
                  sub={data ? `${data.multiPageToday} looked at more than one page` : " "} />
            <Stat icon={<MonitorSmartphone size={12} />} label="On a phone"
                  value={`${devTotal ? Math.round(((data?.devices.mobile ?? 0) / devTotal) * 100) : 0}%`}
                  sub={data ? `${data.devices.mobile} phone, ${data.devices.desktop} computer` : " "} />
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300/90">Last 14 days</div>
              <div className="mt-3 flex h-14 items-end gap-1" role="img" aria-label="Visitors per day for the last 14 days">
                {(data?.series ?? []).map((s) => (
                  <div key={s.day} title={`${s.day}: ${s.visitors}`} className="flex-1 rounded-sm bg-emerald-400/70"
                       style={{ height: `${Math.max(6, (s.visitors / max) * 100)}%`, opacity: s.visitors ? 1 : 0.25 }} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Where from</div>
              <BarList rows={data?.countries ?? []} total={today}
                       label={(r) => <span>{flag(r.name)} {r.name === "??" ? "Unknown" : regionName(r.name)}</span>} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">First page they opened</div>
              <BarList rows={data?.landing ?? []} total={today} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">How they found you</div>
              <BarList rows={data?.referrers ?? []} total={today}
                       label={(r) => (r.name === "direct" ? "Typed the address or an app" : r.name)} />
            </div>
          </div>
          {data?.truncated ? (
            <p className="mt-3 text-[11.5px] text-amber-300">Very busy period: older days may be undercounted.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
