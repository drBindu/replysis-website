"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "./shared";

export default function DemoSection({ onNav }: { onNav: (p: string) => void }) {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo-section" className="py-28 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <FadeUp className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 mb-4 uppercase tracking-widest">See It In Action</span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Watch Verchor work live</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Click play. Real question. Perfect answer in under 2 seconds, invisible to the interviewer.</p>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="rounded-3xl overflow-hidden bg-gray-900 shadow-[0_24px_80px_rgba(0,0,0,0.25)] border border-gray-700">
            {/* chrome bar */}
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-800 border-b border-gray-700">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="flex-1 mx-4 bg-gray-700 rounded h-5 flex items-center px-3">
                <span className="text-[10px] text-gray-400 font-medium">Verchor  -  Stealth Overlay Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse block" />
                <span className="text-[10px] text-zinc-600 font-bold">LIVE</span>
              </div>
            </div>

            {/* demo body */}
            <div className="relative p-8 md:p-12" style={{ minHeight: 340 }}>
              <div className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #2E8B45 1px, transparent 0)", backgroundSize: "28px 28px" }} />

              <AnimatePresence mode="wait">
                {!playing ? (
                  <motion.div key="idle" className="relative z-10 space-y-4">
                    <div className="flex items-start gap-3 opacity-50">
                      <span className="flex-shrink-0 mt-1 px-2.5 py-1 rounded-lg bg-gray-700 text-[10px] font-bold text-gray-300">Interviewer</span>
                      <div className="bg-gray-800 border border-gray-600 rounded-2xl px-5 py-3 text-sm text-gray-300">
                        "Tell me about your most challenging technical problem and how you solved it."
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pl-8 opacity-25">
                      <span className="flex-shrink-0 mt-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-[10px] font-bold text-white">Verchor</span>
                      <div className="bg-gray-800 border border-zinc-800/30 rounded-2xl px-5 py-3 text-sm text-gray-400 italic">
                        Waiting to respond...
                      </div>
                    </div>
                    {/* play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button onClick={() => setPlaying(true)}
                        className="group flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center shadow-[0_0_40px_rgba(31,138,62,0.55)] hover:shadow-[0_0_64px_rgba(31,138,62,0.75)] transition-all group-hover:scale-110 animate-pulse-ring">
                          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">Watch live demo</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 space-y-5">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
                      className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-1 px-2.5 py-1 rounded-lg bg-gray-700 text-[10px] font-bold text-gray-300">Interviewer</span>
                      <div className="bg-gray-800 border border-gray-600 rounded-2xl px-5 py-3 text-sm text-gray-200">
                        "Tell me about your most challenging technical problem and how you solved it."
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
                      className="flex items-start gap-3 pl-8">
                      <span className="flex-shrink-0 mt-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-[10px] font-bold text-white">Verchor ⚡</span>
                      <div className="bg-gradient-to-br from-zinc-950/60 to-zinc-950/40 border border-zinc-800/40 rounded-2xl px-5 py-4 text-sm text-gray-200 leading-relaxed">
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
                          "At <span className="text-zinc-400 font-semibold">[Your Company]</span>, our recommendation engine started returning stale results after a Redis schema migration, affecting 12% of users. I traced it to a cache invalidation bug from a key-format change, hot-patched the invalidation logic, deployed a background flush job, and restored full accuracy within 90 minutes. Post-incident I added integration tests for cache consistency to prevent recurrence."
                        </motion.p>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                          className="flex items-center gap-4 mt-3 text-[11px] text-zinc-600/80">
                          <span>⚡ 1.9s response</span><span>📄 Resume-grounded</span><span>👁 Stealth on</span>
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
                      onClick={() => setPlaying(false)}
                      className="text-[12px] text-gray-500 hover:text-gray-300 underline transition-colors">
                      Reset demo
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.25} className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button onClick={() => onNav("mock-interview")}
            className="px-7 py-3.5 bg-gradient-to-r from-zinc-900 to-zinc-900 hover:from-zinc-900 hover:to-zinc-900 text-white font-bold rounded-xl shadow-lg hover:shadow-zinc-300 transition-all">
            Try it yourself, free →
          </button>
          <button onClick={() => onNav("real-interview")}
            className="px-7 py-3.5 bg-white border-2 border-gray-200 hover:border-zinc-400 text-gray-700 font-semibold rounded-xl transition-all">
            See live interview mode
          </button>
        </FadeUp>
      </div>
    </section>
  );
}
