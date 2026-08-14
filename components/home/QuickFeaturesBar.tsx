"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const FEATURES = [
  {
    icon: "📝",
    label: "Resume Builder",
    headline: "Land more interviews",
    desc: "Helps tailor your resume to a target role with editable AI suggestions.",
    cta: "Build my resume",
    path: "resume",
    gradient: "from-zinc-900 to-zinc-900",
    bg: "from-zinc-900/10 to-zinc-900/10",
    border: "border-zinc-600/30",
    badge: "bg-zinc-800/20 text-zinc-600 border border-zinc-600/30",
    stat: "ATS focused",
  },
  {
    icon: "🧠",
    label: "Mock Interview",
    headline: "Practice until perfect",
    desc: "Role-aware generated questions, structured feedback, and instant coaching.",
    cta: "Start practicing",
    path: "mock-interview",
    gradient: "from-zinc-900 to-zinc-900",
    bg: "from-zinc-900/10 to-zinc-900/10",
    border: "border-zinc-600/30",
    badge: "bg-zinc-800/20 text-zinc-600 border border-zinc-600/30",
    hot: true,
    stat: "Role aware",
  },
  {
    icon: "⚡",
    label: "Live Interview Copilot",
    headline: "Ace your real interview",
    desc: "Streams resume-grounded suggestions to the desktop overlay with standard capture-path controls.",
    cta: "Try live copilot",
    path: "real-interview",
    gradient: "from-zinc-800 to-zinc-900",
    bg: "from-zinc-800/10 to-zinc-900/10",
    border: "border-zinc-600/30",
    badge: "bg-zinc-800/20 text-zinc-600 border border-zinc-600/30",
    stat: "< 2s live",
  },
];

export default function QuickFeaturesBar({ onNav }: { onNav: (p: string) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 px-6 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 50%, #FFFFFF 100%)" }}>

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(31,138,62,0.2) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(70,162,87,0.2) 0%, transparent 70%)", filter: "blur(80px)" }} />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-gray-500 bg-gray-100 border border-gray-200 uppercase tracking-widest mb-4">3 Ways Replysis Helps You</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            From zero to offer:{" "}
            <span className="bg-gradient-to-r from-zinc-600 to-zinc-600 bg-clip-text text-transparent">all in one place.</span>
          </h2>
        </motion.div>

        <div ref={ref} className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 50, scale: 0.94 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.65, delay: i * 0.13, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onNav(f.path)}
              className={`relative rounded-3xl border ${f.border} bg-gradient-to-br ${f.bg} backdrop-blur-sm p-8 cursor-pointer group hover:shadow-[0_0_60px_rgba(31,138,62,0.2)] hover:-translate-y-3 transition-all duration-300`}>

              {f.hot && (
                <span className="absolute top-5 right-5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-zinc-800 text-gray-900 shadow-lg">
                  Most Popular
                </span>
              )}

              {/* Stat badge */}
              <div className="flex items-center justify-between mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-3xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {f.icon}
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${f.badge}`}>{f.stat}</span>
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${f.badge} mb-3 inline-block`}>
                {f.label}
              </span>

              <h3 className="text-xl font-black text-gray-900 mb-2 leading-snug">{f.headline}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">{f.desc}</p>

              <div className={`inline-flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${f.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-200`}>
                {f.cta}
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.3 }}>→</motion.span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
