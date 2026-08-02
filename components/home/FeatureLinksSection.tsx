"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function FeatureLinksSection({ onNav }: { onNav: (p: string) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section className="py-10 px-6 bg-white border-b border-gray-100">
      <div ref={ref} className="max-w-3xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4 }}
          className="text-center text-[12px] text-gray-400 font-medium mb-6">
          Or jump straight into a tool
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">

          {/* Resume Builder  -  matches Windows download button style */}
          <motion.button
            onClick={() => onNav("resume")}
            initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-3 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[15px] rounded-2xl shadow-[0_4px_24px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_32px_rgba(99,102,241,0.55)] transition-all active:scale-[0.97]">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Resume Builder</span>
            <span className="text-indigo-300 text-[11px] font-semibold bg-indigo-500/40 px-2 py-0.5 rounded-full">Free</span>
          </motion.button>

          {/* Mock Interview  -  same fill style, violet */}
          <motion.button
            onClick={() => onNav("mock-interview")}
            initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-3 px-7 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[15px] rounded-2xl shadow-[0_4px_24px_rgba(139,92,246,0.4)] hover:shadow-[0_6px_32px_rgba(139,92,246,0.55)] transition-all active:scale-[0.97]">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
            </svg>
            <span>Mock Interview</span>
            <span className="text-violet-300 text-[11px] font-semibold bg-violet-500/40 px-2 py-0.5 rounded-full">Popular</span>
          </motion.button>

          {/* Live Copilot  -  outlined style, matches macOS button */}
          <motion.button
            onClick={() => onNav("real-interview")}
            initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-3 px-7 py-3.5 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-bold text-[15px] rounded-2xl transition-all hover:shadow-md active:scale-[0.97]">
            <svg className="w-5 h-5 flex-shrink-0 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Live Copilot</span>
            <span className="text-gray-400 text-[11px] font-semibold bg-gray-100 px-2 py-0.5 rounded-full">Pro</span>
          </motion.button>

        </div>
      </div>
    </section>
  );
}
