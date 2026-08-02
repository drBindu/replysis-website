// app/real-interview/popup/page.tsx
// Stealth popup window  -  survives main tab closing
// Opens via window.open()  -  no browser UI, stays on top
//
// Config is read from localStorage ("interviewConfig") first, then falls back
// to URL search params.  This avoids the ~2000-char URL length limit which
// silently truncates large resume text.  The opener page should write to
// localStorage before calling window.open().
//
// userEmail is pulled from Firebase auth so sessions are attributed correctly.

"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { auth } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useInterview } from "../_hooks/useInterview";
import AnswerDisplay   from "../_components/AnswerDisplay";
import TranscriptBar   from "../_components/TranscriptBar";
import MicButton       from "../_components/MicButton";

export default function PopupPage() {
  const params = useSearchParams();

  // ── Read config: localStorage first, then URL params as fallback ──
  // localStorage avoids the ~2000-char URL limit that silently truncates resumes.
  let stored: Record<string, string> = {};
  try {
    const raw = typeof window !== "undefined"
      ? localStorage.getItem("interviewConfig") : null;
    if (raw) stored = JSON.parse(raw);
  } catch {}

  // userEmail must come from onAuthStateChanged, not auth.currentUser (which is
  // null synchronously on first render because Firebase auth initialises async).
  const [userEmail, setUserEmail] = useState("");
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserEmail(u?.email ?? "");
    });
    return () => unsub();
  }, []);

  const config = {
    resume:         stored.resume         ?? params.get("resume")  ?? "",
    jobDescription: stored.jobDescription ?? params.get("jd")      ?? "",
    companyName:    stored.companyName    ?? params.get("company") ?? "",
    role:           stored.role           ?? params.get("role")    ?? "",
    userEmail,
  };

  const {
    isRecording, isGenerating,
    transcript, partial,
    answer,
    toggleMic, generateAnswer,
    clear, handleSpacebar,
  } = useInterview(config);

  // ── Spacebar ──
  useEffect(() => {
    window.addEventListener("keydown", handleSpacebar);
    return () => window.removeEventListener("keydown", handleSpacebar);
  }, [handleSpacebar]);

  // ── ESC to clear ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") { e.preventDefault(); clear(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  // ── Mic indicator color ──
  const micColor = isGenerating
    ? "#f97316"  // orange  -  thinking
    : isRecording
    ? "#22c55e"  // green   -  listening
    : "#ef4444"; // red     -  ready

  const micLabel = isGenerating
    ? "THINKING"
    : isRecording
    ? "LISTENING"
    : "READY";

  return (
    <div className="w-screen h-screen bg-[#030712] text-white font-sans antialiased overflow-hidden select-none">

      {/* ══════════════════════════════════════
          HEADER
          ══════════════════════════════════════ */}
      <div className="h-9 flex items-center justify-between px-4 border-b border-white/8 bg-black/60">

        {/* Mic status dot + label */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              boxShadow: isRecording
                ? [`0 0 0px ${micColor}`, `0 0 8px ${micColor}`, `0 0 0px ${micColor}`]
                : `0 0 0px ${micColor}`,
            }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            style={{ backgroundColor: micColor }}
            className="w-2 h-2 rounded-full"
          />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
            {micLabel}
          </span>
        </div>

        {/* App name */}
        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
          Interview Copilot
        </span>

        {/* Close button */}
        <button
          onClick={() => window.close()}
          className="text-white/30 hover:text-white/80 transition-colors text-sm font-bold px-1"
        >
          ✕
        </button>
      </div>

      {/* ══════════════════════════════════════
          ANSWER AREA  -  takes all space
          ══════════════════════════════════════ */}
      <div className="flex flex-col"
        style={{ height: "calc(100vh - 36px - 44px - 52px)" }}>

        {/* Answer display */}
        <div className="flex-1 overflow-y-auto px-5 py-4
          [&::-webkit-scrollbar]:w-[2px]
          [&::-webkit-scrollbar-thumb]:bg-white/10
          [&::-webkit-scrollbar-track]:bg-transparent">
          <AnswerDisplay
            answer={answer}
            isGenerating={isGenerating}
            isRecording={isRecording}
          />
        </div>

        {/* ══════════════════════════════════════
            TRANSCRIPT STRIP
            ══════════════════════════════════════ */}
        <div className="shrink-0 mx-4 mb-2 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest shrink-0 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Interviewer
            </span>
            <p className="text-xs text-slate-400 truncate leading-none flex-1">
              {transcript && (
                <span className="opacity-50">
                  {transcript.length > 80
                    ? "..." + transcript.slice(-80)
                    : transcript}
                </span>
              )}
              {partial && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="text-blue-400"
                >
                  {transcript ? " " : ""}{partial}
                </motion.span>
              )}
              {!transcript && !partial && (
                <span className="text-slate-700 italic">
                  Waiting for audio...
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FOOTER  -  mic button
          ══════════════════════════════════════ */}
      <div className="h-[52px] border-t border-white/8 bg-black/60 flex items-center justify-center gap-6 px-5">

        {/* Clear button */}
        <button
          onClick={clear}
          className="text-[9px] font-black text-white/20 hover:text-white/60 uppercase tracking-widest transition-colors"
        >
          ESC Clear
        </button>

        {/* Mic button  -  desktop circular style */}
        <MicButton
          isRecording={isRecording}
          isGenerating={isGenerating}
          onToggle={toggleMic}
          onGenerate={generateAnswer}
          isMobile={false}
        />

        {/* Spacebar hint */}
        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
          Space
        </span>
      </div>

    </div>
  );
}