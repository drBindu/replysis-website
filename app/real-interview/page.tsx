"use client";

// app/real-interview/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2, Zap, BarChart2, Sparkles,
  ArrowRight, Coins, Flame,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import AuthModal from "../../components/AuthModal";
import SetupForm from "./_components/SetupForm";

export type InterviewConfig = {
  resume:         string;
  jobDescription: string;
  companyName:    string;
  role:           string;
};

// ─────────────────────────────────────────────
// SANITIZE
// ─────────────────────────────────────────────
function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[- - ]/g, "-")
    .replace(/•/g, "•")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E\n\r\t•]/g, " ")
    .replace(/  +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────
// CREDITS DISPLAY
// ─────────────────────────────────────────────
function CreditsDisplay({
  credits, plan, loading, onUpgrade,
}: {
  credits: number; plan: string;
  loading: boolean; onUpgrade: () => void;
}) {
  const isPro   = ["pro", "lifetime", "teams"].includes(plan);
  const isLow   = !isPro && credits <= 10;
  const isEmpty = !isPro && credits <= 0;

  if (loading) return (
    <div className="h-7 w-28 rounded-lg animate-pulse"
      style={{ background: "#e4e8f2", border: "1px solid #d4dae6" }} />
  );

  if (isPro) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.09)" }}>
      <Sparkles size={11} className="text-zinc-800" />
      <span className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.15em]">
        Pro · Unlimited
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{
          border: isEmpty ? "1px solid rgba(239,68,68,0.3)" : isLow ? "1px solid rgba(33,146,74,0.3)" : "1px solid #d4dae6",
          background: isEmpty ? "rgba(239,68,68,0.07)" : isLow ? "rgba(33,146,74,0.07)" : "#edf0f6",
        }}>
        <Coins size={10} style={{ color: isEmpty ? "#ef4444" : isLow ? "#2E8B45" : "#94a3b8" }} />
        <span className="text-[11px] font-black" style={{ color: isEmpty ? "#ef4444" : isLow ? "#2E8B45" : "#475569" }}>
          {credits.toLocaleString()}
          <span className="font-normal text-[10px] ml-1 opacity-60">credits</span>
        </span>
        {isLow && (
          <div className="flex items-center gap-1">
            <Flame size={9} style={{ color: isEmpty ? "#ef4444" : "#2E8B45" }} />
            <span className="text-[9px] font-black" style={{ color: isEmpty ? "#ef4444" : "#2E8B45" }}>
              {isEmpty ? "Empty" : "Low"}
            </span>
          </div>
        )}
      </div>
      {(isLow || isEmpty) && (
        <button onClick={onUpgrade}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white transition-all shadow-sm"
          style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>
          Upgrade
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function RealInterviewPage() {
  const router                              = useRouter();
  const [user, setUser]                     = useState<any>(null);
  const [authLoading, setLoading]           = useState(true);
  const [showAuth, setShowAuth]             = useState(false);
  const [credits, setCredits]               = useState<number>(0);
  const [plan, setPlan]                     = useState<string>("free");
  const [creditsLoading, setCreditsLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) { setShowAuth(true); return; }
      setCreditsLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setCredits(data.credits ?? 0);
          setPlan(data.plan ?? "free");
        }
      } catch (err) { console.error("Credits load error:", err); }
      setCreditsLoading(false);
    });
    return unsub;
  }, []);

  const handleStart = (cfg: InterviewConfig) => {
    sessionStorage.setItem("interviewConfig", JSON.stringify({
      ...cfg,
      resume:         sanitizeText(cfg.resume),
      jobDescription: sanitizeText(cfg.jobDescription),
    }));
    router.push("/real-interview/interview");
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
    </div>
  );

  // Matte design tokens  -  matches interview page
  const PG  = "#dde3ed";
  const PNL = "#f2f4f8";
  const CRD = "#edf0f6";
  const BDR = "#d4dae6";

  return (
    <div className="min-h-screen overflow-x-hidden"
      style={{ background: PG, fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>

      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}

      {!user ? (
        /* ── NOT SIGNED IN ── */
        <div className="relative flex flex-col items-center justify-center min-h-screen gap-8 p-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Sign in to continue</h1>
              <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
                Access Verchor and start your session.
              </p>
            </div>
            <button onClick={() => setShowAuth(true)}
              className="px-8 py-3 rounded-xl font-black text-white transition-all text-sm shadow-lg shadow-zinc-300"
              style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>
              Sign In
            </button>
          </motion.div>
        </div>

      ) : (
        <div className="relative">

          {/* ════════════════ NAVBAR ════════════════ */}
          <nav className="sticky top-0 z-50 border-b shadow-sm"
            style={{ background: PNL, borderColor: BDR }}>
            <div className="max-w-[1400px] mx-auto px-6 h-[60px] flex items-center justify-between">

              {/* Logo  -  Verchor */}
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-black tracking-tight text-slate-800">Verchor</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                    style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.12), rgba(31,138,62,0.10))", border: "1px solid rgba(31,138,62,0.2)", color: "#21924A" }}>
                    AI
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                <CreditsDisplay
                  credits={credits} plan={plan}
                  loading={creditsLoading}
                  onUpgrade={() => router.push("/pricing")}
                />
                <div className="w-px h-4 bg-slate-300" />
                <button onClick={() => router.push("/real-interview/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-800 transition-all"
                  style={{ border: `1px solid ${BDR}`, background: CRD }}>
                  <BarChart2 size={12} /> Sessions
                </button>
              </div>
            </div>
          </nav>

          {/* ════════════════ CONTENT ════════════════ */}
          <div className="max-w-[1400px] mx-auto px-6 py-10">
            <div className="grid lg:grid-cols-[1fr_380px] gap-10 max-w-5xl mx-auto">

              {/* ── LEFT ── */}
              <div className="space-y-6">

                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-2"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4"
                    style={{ border: "1px solid rgba(31,138,62,0.22)", background: "rgba(31,138,62,0.08)", color: "#1C7A3E" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
                    Real-Time AI Interview Copilot
                  </div>
                  <h1 className="text-[2.4rem] font-black tracking-tight leading-[1.05] mb-3 text-slate-900">
                    Start your<br />
                    <span style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Interview Session
                    </span>
                  </h1>
                  <p className="text-slate-500 text-[15px] font-medium leading-relaxed max-w-md">
                    AI listens live and generates tailored answers in under 2s.
                    No resume required to start.
                  </p>
                </motion.div>

                {/* Setup form card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="rounded-3xl shadow-sm p-7"
                  style={{ background: PNL, border: `1px solid ${BDR}` }}
                >
                  <SetupForm
                    onStart={handleStart}
                    onDashboard={() => router.push("/real-interview/dashboard")}
                  />
                </motion.div>
              </div>

              {/* ── RIGHT SIDEBAR ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-4 lg:pt-[112px]"
              >

                {/* How it works */}
                <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: `1px solid ${BDR}`, background: PNL }}>
                  <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BDR}` }}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">How it works</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      {
                        step: "01", title: "Hit Start",
                        desc: "No resume needed. Add one for answers tailored to your experience.",
                        accentBg: "rgba(31,138,62,0.09)", accentBorder: "rgba(31,138,62,0.2)", accentText: "#1C7A3E",
                        kbd: null,
                      },
                      {
                        step: "02", title: "SPACE: Start listening",
                        desc: "Mic turns on. Speak the question aloud or let the interviewer speak.",
                        accentBg: "rgba(31,138,62,0.09)", accentBorder: "rgba(31,138,62,0.2)", accentText: "#1C7A3E",
                        kbd: "SPACE",
                      },
                      {
                        step: "03", title: "SPACE: Get your answer",
                        desc: "AI generates a perfect, resume-backed response in under 2 seconds.",
                        accentBg: "rgba(33,146,74,0.09)", accentBorder: "rgba(33,146,74,0.2)", accentText: "#21924A",
                        kbd: "SPACE",
                      },
                    ].map(({ step, title, desc, accentBg, accentBorder, accentText, kbd }) => (
                      <div key={step} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                          <span className="text-[10px] font-black font-mono" style={{ color: accentText }}>{step}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[13px] font-bold text-slate-800">{title}</p>
                            {kbd && (
                              <kbd className="text-[9px] font-mono font-black text-slate-500 px-1.5 py-0.5 rounded"
                                style={{ border: `1px solid ${BDR}`, background: CRD }}>
                                {kbd}
                              </kbd>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credits */}
                <div className="rounded-2xl p-5 shadow-sm" style={{ border: `1px solid ${BDR}`, background: PNL }}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Credits</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Interview session", cost: "2 credits", color: "#1C7A3E" },
                      { label: "Resume verification", cost: "Free",    color: "#21924A" },
                    ].map(({ label, cost, color }) => (
                      <div key={label} className="flex items-center justify-between py-1.5"
                        style={{ borderBottom: `1px solid ${BDR}` }}>
                        <span className="text-[12px] font-semibold text-slate-600">{label}</span>
                        <span className="text-[11px] font-black font-mono" style={{ color }}>{cost}</span>
                      </div>
                    ))}
                  </div>
                  {plan !== "pro" && (
                    <button onClick={() => router.push("/pricing")}
                      className="w-full mt-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all"
                      style={{ border: "1px solid rgba(31,138,62,0.25)", background: "rgba(31,138,62,0.07)", color: "#1C7A3E" }}>
                      Upgrade to Pro for unlimited credits <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                {/* Shortcuts */}
                <div className="rounded-2xl p-5 shadow-sm" style={{ border: `1px solid ${BDR}`, background: PNL }}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Keyboard Shortcuts</p>
                  <div className="space-y-2.5">
                    {[
                      { key: "SPACE", desc: "Listen / Generate answer" },
                      { key: "ESC",   desc: "Clear current question"   },
                    ].map(({ key, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-slate-600">{desc}</span>
                        <kbd className="text-[10px] font-mono font-black text-slate-700 px-2.5 py-1.5 rounded-lg shadow-sm"
                          style={{ border: `1px solid ${BDR}`, background: CRD }}>
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-[10px] font-semibold text-slate-400">
                  Enterprise-grade · Your data stays private
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}
