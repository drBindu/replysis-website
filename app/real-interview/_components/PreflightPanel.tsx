"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Headphones, Loader2, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { PreflightCheck, PreflightReport, runPreflight } from "../_lib/preflight";

const INITIAL_CHECKS: PreflightCheck[] = [
  { id: "network", label: "Connection", status: "idle", detail: "Checks Replysis availability and response time." },
  { id: "microphone", label: "Microphone", status: "idle", detail: "Requests permission and confirms that audio is reaching the browser." },
  { id: "privacy", label: "Screen-sharing privacy", status: "idle", detail: "Explains the protection available in this browser." },
];

const ICONS = { network: Wifi, microphone: Headphones, privacy: ShieldCheck } as const;

export default function PreflightPanel({ onReady }: { onReady: (ready: boolean) => void }) {
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [running, setRunning] = useState(false);
  const checks = report?.checks ?? INITIAL_CHECKS;

  const run = async () => {
    setRunning(true);
    onReady(false);
    try {
      const next = await runPreflight();
      setReport(next);
      onReady(next.ready);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <ShieldCheck size={16} className="text-emerald-700" /> Pre-interview setup check
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">About 10 seconds. Your test audio is never uploaded or stored.</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {running ? "Checking…" : report ? "Run again" : "Run setup check"}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {checks.map(check => {
          const Icon = ICONS[check.id];
          const passed = check.status === "pass";
          const warned = check.status === "warn";
          const failed = check.status === "fail";
          return (
            <motion.div key={check.id} layout className="flex gap-3 px-5 py-3.5">
              <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                passed ? "bg-emerald-50 text-emerald-700" :
                warned ? "bg-amber-50 text-amber-700" :
                failed ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"
              }`}>
                {passed ? <CheckCircle2 size={16} /> : failed || warned ? <AlertTriangle size={16} /> : <Icon size={16} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black text-slate-800">{check.label}</p>
                  {check.status !== "idle" && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      passed ? "bg-emerald-50 text-emerald-700" : warned ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                    }`}>{passed ? "Ready" : warned ? "Check" : "Fix needed"}</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{check.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {report && (
        <div className={`px-5 py-3 text-xs font-bold ${report.ready ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {report.ready ? "Core checks passed. You can start your session." : "Fix the red item, then run the setup check again."}
        </div>
      )}
    </section>
  );
}
