"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const FEATURES = [
  {
    icon: "📝",
    label: "Resume Builder",
    headline: "Land more interviews",
    desc: "Rewrites your resume to be ATS-perfect and role-specific in minutes.",
    cta: "Build my resume",
    path: "resume",
    gradient: "from-indigo-600 to-violet-600",
    bg: "from-indigo-600/10 to-violet-600/10",
    border: "border-indigo-400/30",
    badge: "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30",
    stat: "3x callbacks",
  },
  {
    icon: "🧠",
    label: "Mock Interview",
    headline: "Practice until perfect",
    desc: "200+ tailored questions for your exact role. Real-time scoring and instant coaching.",
    cta: "Start practicing",
    path: "mock-interview",
    gradient: "from-violet-600 to-pink-600",
    bg: "from-violet-600/10 to-pink-600/10",
    border: "border-violet-400/30",
    badge: "bg-violet-500/20 text-violet-300 border border-violet-400/30",
    hot: true,
    stat: "87% offer rate",
  },
  {
    icon: "⚡",
    label: "Live Interview Copilot",
    headline: "Ace your real interview",
    desc: "Streams perfect answers to your stealth overlay in under 2 seconds, invisible to your interviewer.",
    cta: "Try live copilot",
    path: "real-interview",
    gradient: "from-cyan-500 to-blue-600",
    bg: "from-cyan-500/10 to-blue-600/10",
    border: "border-cyan-400/30",
    badge: "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30",
    stat: "< 2s live",
  },
];

export default function QuickFeaturesBar({ onNav }: { onNav: (p: string) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 px-6 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0f0c29 0%, #1a1040 50%, #0f172a 100%)" }}>

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)", filter: "blur(80px)" }} />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-gray-400 bg-white/5 border border-white/10 uppercase tracking-widest mb-4">3 Ways Verchor Helps You</span>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            From zero to offer:{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">all in one place.</span>
          </h2>
        </motion.div>

        <div ref={ref} className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 50, scale: 0.94 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.65, delay: i * 0.13, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onNav(f.path)}
              className={`relative rounded-3xl border ${f.border} bg-gradient-to-br ${f.bg} backdrop-blur-sm p-8 cursor-pointer group hover:shadow-[0_0_60px_rgba(99,102,241,0.2)] hover:-translate-y-3 transition-all duration-300`}>

              {f.hot && (
                <span className="absolute top-5 right-5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-violet-500 text-white shadow-lg">
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

              <h3 className="text-xl font-black text-white mb-2 leading-snug">{f.headline}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">{f.desc}</p>

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
