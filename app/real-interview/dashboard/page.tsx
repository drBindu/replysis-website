// app/real-interview/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Plus,
  BarChart2, Calendar, Clock,
  MessageSquare, AlertCircle, RefreshCw,
  BrainCircuit,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import AuthModal from "../../../components/AuthModal";
import { useSession } from "../_hooks/useSession";
import SessionCard from "../_components/SessionCard";

// Design tokens  -  matches the rest of the app
const C = {
  pageBg:  "#dde3ed",
  panelBg: "#f2f4f8",
  cardBg:  "#edf0f6",
  border:  "#d4dae6",
};

export default function DashboardPage() {
  const router                    = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [authLoading, setLoading] = useState(true);
  const [showAuth, setShowAuth]   = useState(false);

  const userEmail = user?.email || "";

  const {
    sessions, loading, loadError,
    loadSessions,
    formatDate, formatDuration,
  } = useSession(userEmail);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
      if (!u) setShowAuth(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (userEmail) loadSessions();
  }, [userEmail, loadSessions]);

  const totalQuestions = sessions.reduce((s, sess) => s + (sess.questionCount || 0), 0);
  const totalMins      = Math.round(
    sessions.reduce((s, sess) => s + (sess.durationSecs || 0), 0) / 60
  );

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.pageBg }}>
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen antialiased"
      style={{ background: C.pageBg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-30 border-b shadow-sm"
        style={{ background: C.panelBg, borderColor: C.border }}>
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/real-interview")}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
              style={{ border: `1px solid ${C.border}`, background: C.panelBg }}>
              <ArrowLeft size={15} />
            </button>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <BrainCircuit size={14} className="text-white" />
              </div>
              <span className="text-[14px] font-black text-slate-800 tracking-tight">Verchor</span>
              <span className="text-[10px] font-black text-indigo-500 px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.18)" }}>
                AI
              </span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <span className="text-[13px] font-bold text-slate-600">Session History</span>
          </div>

          <button onClick={() => router.push("/real-interview")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <Plus size={13} /> New Session
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-8 pb-20">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: MessageSquare, label: "Sessions",           value: sessions.length, color: "#4f46e5" },
            { icon: BarChart2,     label: "Questions Answered", value: totalQuestions,  color: "#7c3aed" },
            { icon: Calendar,      label: "Minutes Practiced",  value: totalMins,       color: "#059669" },
          ].map(({ icon: Icon, label, value, color }) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center shadow-sm"
              style={{ background: C.panelBg, border: `1px solid ${C.border}` }}>
              <Icon size={16} className="mx-auto mb-2" style={{ color }} />
              <p className="text-[28px] font-black font-mono leading-none mb-1" style={{ color }}>
                {value}
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Session list ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-[13px] font-semibold text-slate-400">Loading sessions...</p>
          </div>

        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-[15px] font-black text-slate-700 mb-1">Could not load sessions</p>
              <p className="text-[12px] font-medium text-slate-400 max-w-xs">{loadError}</p>
            </div>
            <button onClick={() => loadSessions()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-indigo-600 transition-all"
              style={{ border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.07)" }}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>

        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: C.cardBg, border: `1.5px dashed ${C.border}` }}>
              <MessageSquare size={26} className="text-slate-300" />
            </div>
            <div>
              <p className="text-[17px] font-black text-slate-700 mb-1.5 tracking-tight">No sessions yet</p>
              <p className="text-[13px] font-medium text-slate-400 max-w-xs leading-relaxed">
                Start an interview session and your Q&A history will appear here automatically.
              </p>
            </div>
            <button onClick={() => router.push("/real-interview")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-black text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <Plus size={14} /> Start First Session
            </button>
          </div>

        ) : (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-3"
          >
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
            </p>
            {sessions.map(session => (
              <motion.div key={session.id}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                <SessionCard
                  session={session}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}
