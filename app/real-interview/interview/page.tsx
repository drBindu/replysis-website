"use client";

// app/real-interview/interview/page.tsx

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, RotateCcw, Settings, X,
  Zap, Check, Cpu, Activity, Mic, MicOff,
  Loader2, Clock, BrainCircuit,
  PhoneOff, MessageSquare, FileText,
  CheckCircle2, Sparkles, User,
} from "lucide-react";
import { useInterview }               from "../_hooks/useInterview";
import { useSession }                 from "../_hooks/useSession";
import { useAuth }                    from "../../../components/AuthProvider";
import { parseAnswer, isMicroAnswer } from "../_lib/formatAnswer";
import type { AppSettings }           from "../_lib/settings";
import {
  MODELS, loadSettings, saveSettings, DEFAULT_SETTINGS,
} from "../_lib/settings";
import { clearSessionState } from "../_lib/promptBuilder";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  pageBg:   "#dde3ed",
  panelBg:  "#f2f4f8",
  cardBg:   "#edf0f6",
  border:   "#d4dae6",
  borderXl: "#c9d0de",
};

// ─────────────────────────────────────────────
// SETTINGS DRAWER
// ─────────────────────────────────────────────
function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS]         = useState<AppSettings>(() => {
    try { return loadSettings(); } catch { return DEFAULT_SETTINGS; }
  });
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setS(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    saveSettings(s);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 h-full w-[320px] z-50 flex flex-col border-l shadow-2xl"
            style={{ background: C.panelBg, borderColor: C.border }}
          >
            <div className="h-14 px-5 flex items-center justify-between shrink-0"
              style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <Settings size={13} className="text-zinc-800" />
                </div>
                <span className="text-[14px] font-bold text-slate-700">Session Settings</span>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                style={{ border: `1px solid ${C.border}`, background: C.panelBg }}>
                <X size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6
              [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-slate-300">

              {/* Model */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={12} className="text-zinc-800" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">AI Model</p>
                </div>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => set("model", m.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                        s.model === m.id
                          ? "border-zinc-300 bg-zinc-100"
                          : "hover:border-slate-300"
                      }`}
                      style={{ borderColor: s.model === m.id ? undefined : C.border, background: s.model === m.id ? undefined : C.panelBg }}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${s.model === m.id ? "bg-zinc-800" : "bg-slate-300"}`} />
                        <span className={`text-[13px] font-bold ${s.model === m.id ? "text-zinc-900" : "text-slate-600"}`}>{m.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide ${
                        m.color === "blue"   ? "text-zinc-900 bg-zinc-100 border-zinc-200"         :
                        m.color === "purple" ? "text-zinc-900 bg-zinc-100 border-zinc-200"   :
                        m.color === "green"  ? "text-zinc-900 bg-zinc-100 border-zinc-200":
                        m.color === "yellow" ? "text-zinc-900 bg-zinc-100 border-zinc-200"      :
                                               "text-red-600 bg-red-50 border-red-100"
                      }`}>{m.tag}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* STT */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mic size={12} className="text-zinc-800" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Speech Recognition</p>
                </div>
                <div className="mb-4 p-4 rounded-xl border" style={{ background: C.cardBg, borderColor: C.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-slate-700 font-bold">Transcription Delay</span>
                    <span className="text-[13px] font-black text-zinc-900 font-mono">{s.maxDelay}s</span>
                  </div>
                  <input type="range" min={0.7} max={2.0} step={0.1}
                    value={s.maxDelay} onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) set("maxDelay", v); }}
                    className="w-full accent-zinc-800 cursor-pointer h-1.5" />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">Faster (0.7s)</span>
                    <span className="text-[10px] text-slate-400">Accurate (2.0s)</span>
                  </div>
                </div>
                <div>
                  <span className="text-[13px] text-slate-700 font-bold block mb-2">Accuracy Mode</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["enhanced", "standard"] as const).map(op => (
                      <button key={op} onClick={() => set("operatingPoint", op)}
                        className={`py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider border transition-all ${
                          s.operatingPoint === op
                            ? "bg-zinc-100 border-zinc-300 text-zinc-900"
                            : "text-slate-500 hover:border-slate-300"
                        }`}
                        style={{ borderColor: s.operatingPoint !== op ? C.border : undefined,
                                 background:  s.operatingPoint !== op ? C.panelBg : undefined }}>
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Temperature */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={12} className="text-zinc-800" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Response Style</p>
                </div>
                <div className="p-4 rounded-xl border" style={{ background: C.cardBg, borderColor: C.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-slate-700 font-bold">Temperature</span>
                    <span className="text-[13px] font-black text-zinc-900 font-mono">{s.temperature}</span>
                  </div>
                  <input type="range" min={0.0} max={1.0} step={0.1}
                    value={s.temperature} onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) set("temperature", v); }}
                    className="w-full accent-zinc-800 cursor-pointer h-1.5" />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">Precise (0.0)</span>
                    <span className="text-[10px] text-slate-400">Creative (1.0)</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
                  saved ? "border" : "text-white shadow-lg shadow-zinc-300"
                }`}
                style={saved
                  ? { background: "rgba(33,146,74,0.08)", borderColor: "#CB7748", color: "#21924A" }
                  : { background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>
                {saved ? <><Check size={15} /> Saved!</> : "Apply Settings"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// ANSWER RENDERER
// ─────────────────────────────────────────────
function AnswerRenderer({
  answer, isGenerating, isRecording,
}: { answer: string; isGenerating: boolean; isRecording: boolean }) {

  if (isGenerating) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
      <div className="relative">
        <motion.div animate={{ scale: [1, 2.2], opacity: [0.15, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute inset-0 rounded-full bg-zinc-400" />
        <motion.div animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-[-6px] rounded-full"
          style={{ background: "conic-gradient(from 0deg, transparent 0%, transparent 60%, rgba(31,138,62,0.7) 80%, transparent 100%)" }}
        />
        <div className="w-14 h-14 rounded-full bg-zinc-100 border-2 border-zinc-300 flex items-center justify-center relative z-10">
          <BrainCircuit size={22} className="text-zinc-800" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[18px] font-black text-slate-800 mb-1.5 tracking-tight">Crafting your answer...</p>
        <p className="text-[13px] text-slate-500 font-medium">Reading your background against the question</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i}
            className="w-2 h-2 rounded-full bg-zinc-400"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );

  if (isRecording && !answer) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
      <div className="relative">
        <motion.div animate={{ scale: [1, 1.8], opacity: [0.18, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 rounded-full bg-zinc-400" />
        <motion.div animate={{ scale: [1, 1.7], opacity: [0.1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
          className="absolute inset-0 rounded-full bg-zinc-400" />
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="w-14 h-14 rounded-full bg-zinc-100 border-2 border-zinc-400 flex items-center justify-center relative z-10"
        >
          <Mic size={22} className="text-zinc-800" />
        </motion.div>
      </div>
      <div className="text-center">
        <p className="text-[18px] font-black text-slate-800 mb-1.5 tracking-tight">Listening...</p>
        <p className="text-[13px] text-slate-500 font-medium">Press Space when they finish speaking</p>
      </div>
    </div>
  );

  if (!answer) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-16">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: C.cardBg, border: `1.5px solid ${C.border}` }}>
        <Sparkles size={20} className="text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-[18px] font-black text-slate-700 mb-1.5 tracking-tight">Ready to help</p>
        <p className="text-[13px] text-slate-500 font-medium mb-6">Press Space to start listening</p>
        <div className="flex items-center justify-center gap-3">
          <kbd className="inline-block text-[13px] font-mono font-black text-slate-700 px-6 py-3 rounded-xl shadow-sm tracking-widest"
            style={{ border: `1.5px solid ${C.borderXl}`, background: C.panelBg }}>
            SPACE
          </kbd>
          <span className="text-[12px] text-slate-400 font-medium">to listen & generate</span>
        </div>
      </div>
    </div>
  );

  // Short MICRO answer  -  big teleprompter style
  if (isMicroAnswer(answer)) return (
    <motion.div key={answer}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[220px] px-8 py-10">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
          style={{ background: "rgba(31,138,62,0.08)", border: "1px solid rgba(31,138,62,0.15)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Suggested Response</span>
        </div>
        <p className="text-[24px] font-black text-slate-900 leading-[1.6] tracking-tight">
          {answer}
        </p>
      </div>
    </motion.div>
  );

  // Structured bullet answer
  const lines = parseAnswer(answer);
  return (
    <motion.div key={answer.slice(0, 20)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="space-y-2.5 py-2">
      {lines.map((line, i) =>
        line.type === "bullet" ? (
          <motion.div key={i}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-4 items-start p-4 rounded-xl border transition-all hover:shadow-sm"
            style={{ background: C.panelBg, borderColor: C.border }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#a5b4fc")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
            <div className="w-6 h-6 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={13} className="text-zinc-900" />
            </div>
            <p className="text-[15px] font-bold text-slate-900 leading-[1.75]">{line.text}</p>
          </motion.div>
        ) : (
          <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="text-slate-500 text-[12px] font-medium leading-relaxed px-2">
            {line.text}
          </motion.p>
        )
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function InterviewPage() {
  const router                          = useRouter();
  const { user }                        = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [settings, setSettings]         = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab]       = useState<"response" | "history">("response");

  // Track transcript changes for highlight effect
  const [transcriptFlash, setTranscriptFlash] = useState(false);
  const prevTranscript   = useRef("");
  const prevGenerating   = useRef(false);  // detect isGenerating → false transition

  useEffect(() => { setSettings(loadSettings()); }, []);

  // Clear stale locked facts whenever this page mounts (e.g. back-navigation
  // after a previous session without hitting "End Session").
  useEffect(() => { clearSessionState(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to setup if sessionStorage is missing or corrupted.
  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("interviewConfig")) {
      router.replace("/real-interview");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const raw = typeof window !== "undefined"
    ? sessionStorage.getItem("interviewConfig") : null;
  let config = { resume: "", jobDescription: "", companyName: "", role: "" };
  try {
    if (raw) config = { ...config, ...JSON.parse(raw) };
  } catch {
    // corrupted sessionStorage  -  use safe defaults, redirect effect above will fire
  }

  const userEmail = user?.email || "";

  const {
    isRecording, isGenerating,
    transcript, partial,
    answer, history,
    sessionSecs, micStatus,
    toggleMic, generateAnswer,
    clear, resetSession,
    handleSpacebar,
  } = useInterview({
    ...config, userEmail,
    model:          settings.model,
    maxDelay:       settings.maxDelay,
    operatingPoint: settings.operatingPoint,
  });

  const { upsertSession, saving, formatDuration } = useSession(userEmail);
  const [autoSaved, setAutoSaved] = useState(false);

  // ── AUTO-SAVE after every answer (mirrors native app: saves each Q&A immediately) ──
  useEffect(() => {
    const justFinished = prevGenerating.current && !isGenerating;
    prevGenerating.current = isGenerating;

    if (justFinished && history.length > 0) {
      upsertSession({
        companyName:  config.companyName,
        role:         config.role,
        resume:       config.resume,
        turns:        history,
        durationSecs: sessionSecs,
      }).then(() => {
        // Brief "Saved" flash so user knows session is persisted
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      });
    }
  }, [isGenerating]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flash highlight when transcript finalises
  useEffect(() => {
    if (transcript && transcript !== prevTranscript.current) {
      prevTranscript.current = transcript;
      setTranscriptFlash(true);
      const t = setTimeout(() => setTranscriptFlash(false), 900);
      return () => clearTimeout(t);
    }
  }, [transcript]);

  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleSpacebar);
    return () => window.removeEventListener("keydown", handleSpacebar);
  }, [handleSpacebar]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Escape" && !settingsOpen) { e.preventDefault(); clear(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [clear, settingsOpen]);

  const copyAnswer = useCallback(() => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [answer]);

  // End session  -  session is already saved in real-time, just clean up
  const endSession = useCallback(async () => {
    // Final update to capture latest duration, then navigate
    if (history.length > 0) {
      await upsertSession({
        companyName:  config.companyName,
        role:         config.role,
        resume:       config.resume,
        turns:        history,
        durationSecs: sessionSecs,
      });
    }
    resetSession();
    router.push("/real-interview");
  }, [upsertSession, config, history, sessionSecs, resetSession, router]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Smart resume preview
  const getResumePreview = (t: string) => {
    if (!t || t.trim().length < 10) return { type: "empty" as const };
    if (
      t.startsWith("PK") ||
      t.includes("[Content_Types]") ||
      t.includes("<?xml") ||
      t.includes("w:document") ||
      (t.includes("PK") && t.includes("word"))
    ) return { type: "binary" as const };
    const cleaned = t
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/  +/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const ratio = (cleaned.match(/[a-zA-Z]/g) || []).length / Math.max(cleaned.length, 1);
    if (ratio < 0.35) return { type: "binary" as const };
    return { type: "text" as const, content: cleaned.slice(0, 500) };
  };

  const resumePreview = getResumePreview(config.resume);
  const qCount        = history.filter(t => t.role === "interviewer").length;
  const aCount        = history.filter(t => t.role === "candidate").length;
  const activeModel   = MODELS.find(m => m.id === settings.model) || MODELS[0];

  // State pill config
  const stateConfig = isGenerating
    ? { label: "Thinking...",  bg: "rgba(31,138,62,0.09)",  border: "rgba(31,138,62,0.22)",  text: "#1C7A3E",  dotClass: "bg-zinc-600",  spin: true  }
    : isRecording
    ? { label: "Listening",    bg: "rgba(33,146,74,0.09)",  border: "rgba(33,146,74,0.25)",  text: "#21924A",  dotClass: "bg-zinc-800", spin: false }
    : { label: "Ready",        bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)",  text: "#64748b",  dotClass: "bg-slate-400",   spin: false };

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: C.pageBg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      <SettingsDrawer open={settingsOpen} onClose={handleSettingsClose} />

      {/* ═══════════════ TOP NAV ═══════════════ */}
      <nav className="h-14 flex items-center justify-between px-5 shrink-0 z-30 border-b shadow-sm"
        style={{ background: C.panelBg, borderColor: C.border }}>

        <div className="flex items-center gap-3">
          <button onClick={endSession}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
            style={{ border: `1px solid ${C.border}`, background: C.panelBg }}>
            <ArrowLeft size={15} />
          </button>

          <div className="h-4 w-px bg-slate-300" />

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>
              <BrainCircuit size={14} className="text-white" />
            </div>
            <span className="text-[14px] font-black text-slate-800 tracking-tight">Verchor</span>
            <span className="text-[10px] font-bold text-zinc-800 px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(31,138,62,0.1)", border: "1px solid rgba(31,138,62,0.18)" }}>
              AI
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300" />

          {/* Status pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all`}
            style={{ background: stateConfig.bg, border: `1px solid ${stateConfig.border}`, color: stateConfig.text }}>
            {stateConfig.spin ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <motion.div
                animate={isRecording ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className={`w-1.5 h-1.5 rounded-full ${stateConfig.dotClass}`}
              />
            )}
            {stateConfig.label}
          </div>

          {(config.role || config.companyName) && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-3 w-px bg-slate-300" />
              <span className="text-[12px] font-semibold text-slate-500 max-w-[200px] truncate">
                {[config.role, config.companyName].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ border: `1px solid ${C.border}`, background: C.cardBg }}>
            <Clock size={11} className="text-slate-400" />
            <span className="font-mono text-[12px] font-black text-slate-700 tabular-nums">
              {formatTime(sessionSecs)}
            </span>
          </div>

          {/* Auto-save indicator  -  flashes green after every Q&A is saved */}
          <AnimatePresence>
            {autoSaved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black"
                style={{ background: "rgba(33,146,74,0.1)", border: "1px solid rgba(33,146,74,0.25)", color: "#21924A" }}
              >
                <Check size={10} />
                Saved
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ border: "1px solid rgba(31,138,62,0.2)", background: "rgba(31,138,62,0.07)" }}>
            <Zap size={10} className="text-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">
              {activeModel.label}
            </span>
          </div>

          <button onClick={copyAnswer} disabled={!answer}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              !answer ? "opacity-30 cursor-not-allowed" : ""
            }`}
            style={{ border: `1px solid ${copied ? "#CB7748" : C.border}`, background: copied ? "rgba(33,146,74,0.08)" : C.panelBg, color: copied ? "#21924A" : "#94a3b8" }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          <button onClick={clear}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
            style={{ border: `1px solid ${C.border}`, background: C.panelBg }}>
            <RotateCcw size={13} />
          </button>

          <button onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
            style={{ border: `1px solid ${C.border}`, background: C.panelBg }}>
            <Settings size={13} />
          </button>

          <button onClick={endSession} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
            style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)", color: "#ef4444" }}>
            <PhoneOff size={11} />
            {saving ? "Saving..." : "End"}
          </button>
        </div>
      </nav>

      {/* ═══════════════ INTERVIEWER TRANSCRIPT BAR ═══════════════ */}
      <div className="shrink-0 border-b px-5 py-3" style={{ background: C.panelBg, borderColor: C.border }}>
        <div className="max-w-5xl mx-auto">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border transition-all`}
            style={{
              borderColor: isRecording ? "rgba(33,146,74,0.3)" : C.border,
              background: isRecording ? "rgba(33,146,74,0.06)" : C.cardBg,
              boxShadow: isRecording ? "0 0 0 3px rgba(33,146,74,0.1), 0 1px 6px rgba(33,146,74,0.08)" : "none",
            }}>

            {/* Avatar with rotating ring when mic is active */}
            <div className="relative w-9 h-9 shrink-0">
              {isRecording && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="absolute rounded-full"
                  style={{
                    inset: -3,
                    background: "conic-gradient(from 0deg, transparent 0%, transparent 50%, rgba(33,146,74,0.85) 72%, transparent 100%)",
                  }}
                />
              )}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all absolute inset-0 z-10 ${
                isRecording ? "bg-zinc-200 border-zinc-300" : "border-slate-200"
              }`} style={{ background: isRecording ? undefined : C.panelBg }}>
                <User size={15} className={isRecording ? "text-zinc-900" : "text-slate-400"} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors ${
                isRecording ? "text-zinc-900" : "text-slate-400"
              }`}>Interviewer</p>

              <p className="text-[14px] font-semibold text-slate-900 leading-relaxed">
                {transcript && (
                  <motion.span
                    animate={transcriptFlash
                      ? { backgroundColor: ["rgba(253,230,138,0.5)", "rgba(253,230,138,0)"] }
                      : { backgroundColor: "rgba(253,230,138,0)" }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="rounded-sm px-0.5 inline"
                  >
                    {transcript.length > 240 ? "…" + transcript.slice(-240) : transcript}
                  </motion.span>
                )}
                {partial && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.85 }}
                    className="text-zinc-800 font-bold">
                    {transcript ? " " : ""}{partial}
                  </motion.span>
                )}
                {!transcript && !partial && (
                  <span className="text-slate-400 text-[13px] italic font-normal">
                    {isRecording ? "Listening… speak now" : "Press Space to start"}
                  </span>
                )}
              </p>
            </div>

            {/* Voice waveform */}
            {isRecording && (
              <div className="flex items-end gap-[3px] shrink-0 self-center px-3 py-1">
                {[0.3,0.6,0.9,0.5,1,0.7,0.4,0.8,1,0.6,0.9,0.4,0.7,0.5].map((h, i) => (
                  <motion.div key={i}
                    className="rounded-full"
                    style={{
                      width: "3px",
                      height: "28px",
                      background: `hsl(${152 + i * 4}, 72%, ${38 + i * 2}%)`,
                    }}
                    animate={{ scaleY: [h, 1, h * 0.12, h * 0.65, h] }}
                    transition={{ duration: 0.48 + i * 0.04, repeat: Infinity, delay: i * 0.055, ease: "easeInOut" }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ MAIN LAYOUT ═══════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-52 border-r p-5 hidden xl:flex flex-col gap-5 shrink-0"
          style={{ borderColor: C.border, background: C.panelBg }}>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Session</p>
            <div className="space-y-1">
              {[
                { label: "Questions", value: qCount,                      color: "#1C7A3E" },
                { label: "Answers",   value: aCount,                      color: "#21924A" },
                { label: "Duration",  value: formatDuration(sessionSecs), color: "#475569" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b"
                  style={{ borderColor: C.border }}>
                  <p className="text-[12px] font-semibold text-slate-600">{label}</p>
                  <p className="text-[20px] font-black font-mono leading-none" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="p-4 rounded-xl border"
            style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.07), rgba(31,138,62,0.07))", borderColor: "rgba(31,138,62,0.18)" }}>
            <div className="flex justify-between mb-2.5">
              <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Progress</p>
              <p className="text-[11px] font-mono text-zinc-800 font-black">{qCount} {qCount === 1 ? "Q" : "Qs"}</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #1C7A3E, #21924A)" }}
                animate={{ width: `${Math.min(qCount * 10, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {qCount >= 10 && (
              <p className="text-[10px] text-zinc-800 mt-2 font-bold text-center">Great session! 🎉</p>
            )}
          </div>

          {/* Shortcuts */}
          <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Shortcuts</p>
            <div className="space-y-2.5">
              {[
                { key: "SPACE", desc: "Listen / Answer" },
                { key: "ESC",   desc: "Clear screen"    },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">{desc}</span>
                  <kbd className="text-[10px] font-mono font-black text-slate-600 px-2.5 py-1 rounded-lg shadow-sm"
                    style={{ border: `1px solid ${C.borderXl}`, background: C.panelBg }}>
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER  -  ANSWER AREA ── */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-3">

          {/* Tab switcher */}
          <div className="flex items-center shrink-0 p-1 rounded-xl w-fit shadow-sm"
            style={{ border: `1px solid ${C.border}`, background: C.panelBg }}>
            {([
              { id: "response", label: "Response",   icon: BrainCircuit },
              { id: "history",  label: "History",    icon: MessageSquare },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  activeTab === id ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                style={activeTab === id ? { background: "linear-gradient(135deg, #1C7A3E, #21924A)" } : {}}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Answer card */}
          <div className="flex-1 rounded-2xl border shadow-sm overflow-hidden flex flex-col"
            style={{ background: C.panelBg, borderColor: C.border }}>

            {/* Minimal header  -  only shows copy when there's an answer */}
            {answer && activeTab === "response" && (
              <div className="h-10 flex items-center justify-end px-4 shrink-0"
                style={{ borderBottom: `1px solid ${C.border}`, background: C.cardBg }}>
                <button onClick={copyAnswer}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all`}
                  style={{
                    borderColor: copied ? "#CB7748" : C.border,
                    background: copied ? "rgba(33,146,74,0.08)" : C.panelBg,
                    color: copied ? "#21924A" : "#94a3b8",
                  }}>
                  {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4
              [&::-webkit-scrollbar]:w-[3px]
              [&::-webkit-scrollbar-thumb]:bg-slate-300
              [&::-webkit-scrollbar-track]:bg-transparent">

              {activeTab === "response" ? (
                <AnswerRenderer
                  answer={answer}
                  isGenerating={isGenerating}
                  isRecording={isRecording}
                />
              ) : (
                <div className="space-y-3 py-3">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <MessageSquare size={28} className="text-slate-300" />
                      <p className="text-[13px] font-semibold text-slate-400">No conversation yet</p>
                    </div>
                  ) : history.map((turn, i) => (
                    <div key={i} className={`flex ${turn.role === "candidate" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[13px] font-semibold leading-relaxed ${
                        turn.role === "interviewer" ? "rounded-tl-sm" : "text-white rounded-tr-sm"
                      }`}
                        style={turn.role === "candidate"
                          ? { background: "linear-gradient(135deg, #1C7A3E, #21924A)" }
                          : { background: C.cardBg, border: `1px solid ${C.border}`, color: "#1e293b" }
                        }>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                          turn.role === "interviewer" ? "text-slate-400" : "text-zinc-300"
                        }`}>
                          {turn.role === "interviewer" ? "Interviewer" : "You"}
                        </p>
                        {turn.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR  -  RESUME ── */}
        <aside className="w-56 border-l p-4 hidden xl:flex flex-col gap-3 shrink-0"
          style={{ borderColor: C.border, background: C.panelBg }}>
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-slate-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resume</p>
          </div>

          {resumePreview.type === "empty" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4"
              style={{ borderColor: C.borderXl }}>
              <FileText size={22} className="text-slate-300" />
              <p className="text-[11px] font-semibold text-slate-400 text-center leading-relaxed">
                No resume loaded.<br />
                <span className="text-slate-300 font-normal">Generic answers mode.</span>
              </p>
            </div>
          ) : resumePreview.type === "binary" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border p-4"
              style={{ background: "rgba(33,146,74,0.06)", borderColor: "rgba(33,146,74,0.2)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(33,146,74,0.1)", border: "1px solid rgba(33,146,74,0.25)" }}>
                <CheckCircle2 size={18} className="text-zinc-900" />
              </div>
              <p className="text-[12px] text-zinc-900 text-center font-black">Resume loaded ✓</p>
              <p className="text-[10px] text-zinc-900/70 text-center leading-relaxed font-medium">
                Full context active
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 rounded-xl border p-3 overflow-y-auto
                [&::-webkit-scrollbar]:w-[2px]
                [&::-webkit-scrollbar-thumb]:bg-slate-300"
                style={{ background: C.cardBg, borderColor: C.border }}>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed whitespace-pre-wrap break-words">
                  {resumePreview.content}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 text-center font-semibold">Full resume in AI context</p>
            </>
          )}
        </aside>
      </div>

      {/* ═══════════════ FOOTER  -  MIC CONTROLS ═══════════════ */}
      <footer className="shrink-0 border-t px-5 py-4"
        style={{ background: C.panelBg, borderColor: C.border }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

          {/* Left hint */}
          <div className="hidden sm:flex flex-col gap-0.5 w-48">
            <p className="text-[12px] font-black text-slate-700">
              {isRecording ? "Space → get answer" : isGenerating ? "Generating..." : "Space → listen"}
            </p>
            {micStatus && micStatus !== "Ready" && micStatus !== "Listening..." && (
              <p className={`text-[11px] font-bold ${
                micStatus.toLowerCase().includes("error") ||
                micStatus.toLowerCase().includes("denied") ||
                micStatus.toLowerCase().includes("authoris") ||
                micStatus.toLowerCase().includes("disconnected")
                  ? "text-red-500"
                  : micStatus.toLowerCase().includes("connect") ||
                    micStatus.toLowerCase().includes("token") ||
                    micStatus.toLowerCase().includes("retry")
                  ? "text-zinc-800"
                  : "text-slate-400"
              }`}>{micStatus}</p>
            )}
            {(!micStatus || micStatus === "Ready") && (
              <p className="text-[10px] font-medium text-slate-400">ESC clears the screen</p>
            )}
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-3 mx-auto">
            {(transcript || answer) && (
              <button onClick={clear}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm"
                style={{ border: `1px solid ${C.borderXl}`, background: C.panelBg, color: "#64748b" }}>
                <RotateCcw size={13} /> Clear
              </button>
            )}

            {/* MAIN MIC BUTTON with rotating ring */}
            <div className="relative flex items-center justify-center">

              {/* Outer pulse rings when recording */}
              {isRecording && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
                    transition={{ repeat: Infinity, duration: 1.3, ease: "easeOut" }}
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "rgba(239,68,68,0.18)", pointerEvents: "none" }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.75], opacity: [0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 1.3, delay: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "rgba(239,68,68,0.09)", pointerEvents: "none" }}
                  />
                </>
              )}

              {/* Rotating comet ring when recording */}
              {isRecording && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  className="absolute rounded-2xl"
                  style={{
                    inset: -5,
                    background: "conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(239,68,68,0.9) 78%, rgba(239,68,68,0.3) 90%, transparent 100%)",
                    pointerEvents: "none",
                  }}
                />
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={isRecording ? generateAnswer : toggleMic}
                disabled={isGenerating}
                className="relative flex items-center gap-3 px-9 py-3.5 rounded-2xl font-black text-[15px] text-white disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden z-10 tracking-tight"
                style={isRecording ? {
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  boxShadow: "0 8px 28px rgba(239,68,68,0.4), 0 2px 8px rgba(239,68,68,0.2)",
                } : {
                  background: "linear-gradient(135deg, #1C7A3E, #21924A)",
                  boxShadow: "0 8px 25px rgba(31,138,62,0.3), 0 2px 8px rgba(31,138,62,0.15)",
                }}
              >
                {isRecording && (
                  <motion.div
                    animate={{ opacity: [0.06, 0, 0.06] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="absolute inset-0 rounded-2xl bg-white"
                  />
                )}
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" /> Generating...</>
                ) : isRecording ? (
                  <><MicOff size={18} /> Stop & Answer</>
                ) : (
                  <><Mic size={18} /> Start Listening</>
                )}
              </motion.button>
            </div>

            {answer && !isRecording && !isGenerating && (
              <button onClick={copyAnswer}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm"
                style={{
                  border: copied ? "1px solid #CB7748" : `1px solid ${C.borderXl}`,
                  background: copied ? "rgba(33,146,74,0.08)" : C.panelBg,
                  color: copied ? "#21924A" : "#64748b",
                }}>
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            )}
          </div>

          {/* Right hint */}
          <div className="hidden sm:flex flex-col items-end gap-0.5 w-48">
            <p className="text-[12px] font-black text-slate-700">
              {isGenerating
                ? "Working on it..."
                : answer
                ? "✓ Answer ready"
                : isRecording
                ? "Mic is live"
                : "Waiting for you"}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              {qCount} {qCount === 1 ? "question" : "questions"} this session
            </p>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap');
        * { -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}
