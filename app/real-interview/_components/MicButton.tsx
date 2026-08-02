// app/real-interview/_components/MicButton.tsx
// Single responsibility: Mic on/off button UI only

"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, ShieldAlert } from "lucide-react";

type Props = {
  isRecording:  boolean;
  isGenerating: boolean;
  onToggle:     () => void;
  onGenerate:   () => void;
  isMobile?:    boolean;
};

export default function MicButton({
  isRecording,
  isGenerating,
  onToggle,
  onGenerate,
  isMobile = false,
}: Props) {

  const handleClick = () => {
    if (isGenerating) return;
    if (isRecording) onGenerate();
    else onToggle();
  };

  // ── MOBILE: full-width tall button ──
  if (isMobile) {
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        disabled={isGenerating}
        className={`
          w-full rounded-2xl font-bold h-28 transition-all shadow-2xl
          flex flex-col items-center justify-center relative overflow-hidden
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRecording
            ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40"
            : "bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/40"
          }
        `}
      >
        {/* Pulse ring when recording */}
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.3], opacity: [0.2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-white/20 rounded-2xl"
          />
        )}

        {isRecording ? (
          <>
            <MicOff size={32} className="text-white mb-1 relative z-10" />
            <span className="text-sm font-bold text-white relative z-10 tracking-wide">
              STOP &amp; GET ANSWER
            </span>
            <span className="text-[10px] text-red-100 mt-1 relative z-10 opacity-90 flex items-center gap-1 font-mono uppercase">
              <ShieldAlert size={10} fill="currentColor" /> or press SPACE
            </span>
          </>
        ) : (
          <>
            <Mic size={36} className="text-white mb-2" />
            <span className="text-sm font-bold text-white tracking-wide">
              TAP TO LISTEN
            </span>
            <span className="text-[10px] text-white/70 mt-1 font-mono">
              or press SPACE
            </span>
          </>
        )}
      </motion.button>
    );
  }

  // ── DESKTOP: circular button ──
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={handleClick}
        disabled={isGenerating}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          shadow-2xl transition-all duration-300 relative overflow-hidden
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRecording
            ? "bg-red-600 scale-105 shadow-red-500/50"
            : "bg-blue-600 shadow-blue-500/40"
          }
        `}
      >
        {/* Pulse ring when recording */}
        {isRecording && (
          <>
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full bg-red-400/40"
            />
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
              className="absolute inset-0 rounded-full bg-red-400/20"
            />
          </>
        )}
        {isRecording
          ? <MicOff size={30} className="text-white relative z-10" />
          : <Mic    size={30} className="text-white relative z-10" />
        }
      </motion.button>

      <span className={`
        text-[10px] font-bold uppercase tracking-widest
        ${isRecording ? "text-red-400" : "text-slate-500"}
      `}>
        {isGenerating ? "Thinking..." : isRecording ? "Stop • Space" : "Listen • Space"}
      </span>
    </div>
  );
}