// app/real-interview/_components/AnswerDisplay.tsx
// Single responsibility: render bullet point answers only

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, BrainCircuit } from "lucide-react";
import { parseAnswer, getAnswerFontSize, isMicroAnswer } from "../_lib/formatAnswer";

type Props = {
  answer:       string;
  isGenerating: boolean;
  isRecording:  boolean;
};

export default function AnswerDisplay({
  answer,
  isGenerating,
  isRecording,
}: Props) {

  // ── LOADING STATE ──
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        >
          <Loader2 size={32} className="text-blue-500" />
        </motion.div>
        <span className="text-[10px] font-black text-slate-600 tracking-[0.4em] uppercase">
          Generating Answer...
        </span>
      </div>
    );
  }

  // ── RECORDING STATE  -  show thinking animation ──
  if (isRecording && !answer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <BrainCircuit size={28} className="text-blue-400" />
        </motion.div>
        <p className="text-slate-600 text-sm font-mono uppercase tracking-widest">
          Listening...
        </p>
      </div>
    );
  }

  // ── EMPTY STATE ──
  if (!answer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
        <Sparkles size={22} className="text-slate-600" />
        <p className="text-slate-600 text-xs font-mono uppercase tracking-[0.3em]">
          Press SPACE or tap mic to begin
        </p>
      </div>
    );
  }

  // ── MICRO ANSWER  -  short direct answer, no bullets ──
  if (isMicroAnswer(answer)) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={answer}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center h-full px-4"
        >
          <p className={`
            ${getAnswerFontSize(answer)}
            text-white font-semibold leading-relaxed text-center
          `}>
            {answer}
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── BULLET ANSWER  -  parsed bullet points ──
  const lines = parseAnswer(answer);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={answer}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 px-2"
      >
        {lines.map((line, i) =>
          line.type === "bullet" ? (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-3 items-start"
            >
              {/* Bullet dot */}
              <span className="text-blue-400 text-xl leading-none mt-1 shrink-0">
                •
              </span>
              {/* Bullet text */}
              <p className="text-white text-lg font-semibold leading-relaxed">
                {line.text}
              </p>
            </motion.div>
          ) : (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="text-slate-300 text-base leading-relaxed"
            >
              {line.text}
            </motion.p>
          )
        )}
      </motion.div>
    </AnimatePresence>
  );
}