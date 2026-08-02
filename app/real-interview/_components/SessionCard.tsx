// app/real-interview/_components/SessionCard.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Clock,
  MessageSquare, Building2, Briefcase, CheckCircle2,
} from "lucide-react";
import type { Session } from "../_hooks/useSession";

// Design tokens  -  matches the rest of the app
const C = {
  panelBg: "#f2f4f8",
  cardBg:  "#edf0f6",
  border:  "#d4dae6",
};

type Props = {
  session:        Session;
  formatDate:     (ts: any) => string;
  formatDuration: (secs: number) => string;
};

export default function SessionCard({ session, formatDate, formatDuration }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Split turns into Q&A pairs
  const pairs: { question: string; answer: string }[] = [];
  const turns = session.turns || [];
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role === "interviewer") {
      const answer = turns[i + 1]?.role === "candidate" ? turns[i + 1].text : "";
      pairs.push({ question: turns[i].text, answer });
      if (answer) i++;
    }
  }

  const hasCompany = session.companyName && session.companyName !== "Unknown";
  const hasRole    = session.role && session.role !== "Unknown";

  return (
    <motion.div layout className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: C.panelBg, border: `1px solid ${C.border}` }}>

      {/* ── Card Header ── */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center justify-between text-left transition-all"
        style={{ background: expanded ? C.cardBg : C.panelBg }}>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <MessageSquare size={15} className="text-indigo-500" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Company / Role */}
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              {hasCompany && (
                <span className="flex items-center gap-1.5 text-[14px] font-black text-slate-800">
                  <Building2 size={12} className="text-slate-400" />
                  {session.companyName}
                </span>
              )}
              {hasRole && (
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                  <Briefcase size={11} className="text-slate-400" />
                  {session.role}
                </span>
              )}
              {!hasCompany && !hasRole && (
                <span className="text-[14px] font-black text-slate-700">Interview Session</span>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400">
                {formatDate(session.createdAt)}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Clock size={10} />
                {formatDuration(session.durationSecs)}
              </span>
              <span className="text-[11px] font-black text-indigo-500">
                {session.questionCount} Q{session.questionCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Chevron */}
        <div className="text-slate-400 shrink-0 ml-4">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Expanded Q&A transcript ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 space-y-4"
              style={{ borderTop: `1px solid ${C.border}`, background: C.cardBg }}>

              {pairs.length === 0 ? (
                <p className="text-[13px] font-medium text-slate-400 italic py-4 text-center">
                  No Q&A recorded in this session.
                </p>
              ) : (
                pairs.map((pair, i) => (
                  <div key={i} className="space-y-2">

                    {/* Exchange number */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
                        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.18)", color: "#4338ca" }}>
                        Exchange {i + 1}
                      </div>
                    </div>

                    {/* Question bubble */}
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "#edf0f6", border: `1px solid ${C.border}` }}>
                        <span className="text-[9px] font-black text-slate-500">Q</span>
                      </div>
                      <div className="flex-1 rounded-xl px-4 py-3"
                        style={{ background: "#f7f8fb", border: `1px solid ${C.border}` }}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interviewer</p>
                        <p className="text-[13px] font-semibold text-slate-800 leading-relaxed">{pair.question}</p>
                      </div>
                    </div>

                    {/* Answer bubble */}
                    {pair.answer && (
                      <div className="flex gap-3 items-start ml-4">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                          <CheckCircle2 size={11} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 rounded-xl px-4 py-3"
                          style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Your Answer</p>
                          {pair.answer.includes("•") ? (
                            <div className="space-y-1.5">
                              {pair.answer.split("\n").map(l => l.trim()).filter(Boolean).map((line, j) =>
                                line.startsWith("•") ? (
                                  <div key={j} className="flex gap-2 items-start">
                                    <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                                    <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">
                                      {line.slice(1).trim()}
                                    </p>
                                  </div>
                                ) : (
                                  <p key={j} className="text-[13px] font-medium text-slate-500 leading-relaxed">{line}</p>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">{pair.answer}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Divider between pairs */}
                    {i < pairs.length - 1 && (
                      <div className="pt-2" style={{ borderBottom: `1px solid ${C.border}` }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
