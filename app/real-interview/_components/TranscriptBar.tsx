// app/real-interview/_components/TranscriptBar.tsx
// Single responsibility: show live interviewer transcript only

"use client";

import { motion } from "framer-motion";

type Props = {
  transcript: string;
  partial:    string;
  isMobile?:  boolean;
};

export default function TranscriptBar({
  transcript,
  partial,
  isMobile = false,
}: Props) {
  const hasText = transcript || partial;

  // ── MOBILE: box style ──
  if (isMobile) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-900/60 to-slate-800/60 rounded-3xl p-5 border border-slate-700/50 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ opacity: hasText ? [1, 0.3, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-2 rounded-full bg-blue-400"
          />
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
            Interviewer
          </span>
        </div>

        <div className="text-base leading-relaxed font-medium">
          {transcript && (
            <span className="text-slate-100">{transcript}</span>
          )}
          {partial && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-blue-400"
            >
              {transcript ? " " : ""}{partial}
            </motion.span>
          )}
          {!hasText && (
            <span className="text-slate-600 italic text-sm">
              Waiting for audio...
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP: slim bar ──
  return (
    <div className="h-14 border-b border-white/5 flex items-center px-10 bg-blue-600/[0.02] relative overflow-hidden">
      <div className="max-w-5xl w-full mx-auto flex items-center gap-4">

        {/* INTERVIEWER badge */}
        <div className="shrink-0 flex items-center gap-2">
          <motion.div
            animate={{ opacity: hasText ? [1, 0.3, 1] : 0.3 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
          />
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">
            Interviewer
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Transcript text */}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm text-slate-300 truncate leading-none">
            {/* Confirmed transcript  -  dimmed */}
            {transcript && (
              <span className="opacity-40">
                {transcript.length > 100
                  ? "..." + transcript.slice(-100)
                  : transcript}
              </span>
            )}

            {/* Live partial  -  bright blue */}
            {partial && (
              <motion.span
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-blue-400 font-medium"
              >
                {transcript ? " " : ""}{partial}
              </motion.span>
            )}

            {/* Empty state */}
            {!hasText && (
              <span className="text-slate-700 italic text-xs uppercase tracking-[0.2em] font-black">
                Awaiting voice input...
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}