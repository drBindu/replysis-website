"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BlurFade } from "./shared";

const PLATFORMS = [
  { name: "Zoom",       color: "#2D8CFF", icon: "Z" },
  { name: "Teams",      color: "#5B5EA6", icon: "T" },
  { name: "Google Meet",color: "#34A853", icon: "M" },
  { name: "HireVue",    color: "#FF6B35", icon: "H" },
  { name: "Webex",      color: "#00B140", icon: "W" },
  { name: "Slack",      color: "#4A154B", icon: "S" },
  { name: "Greenhouse", color: "#24B25C", icon: "G" },
  { name: "Lever",      color: "#5C6BC0", icon: "L" },
];

const TRUST = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Zero Audio Storage",
    desc: "Audio is processed in real-time and never saved to any server. Not even us.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Screen-Share Safe",
    desc: "The overlay is completely invisible on Zoom, Teams, Meet, and every recording tool.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Completely Private",
    desc: "No conversation logs. No usage sold to third parties. Your data is yours alone.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Sub-2s Response",
    desc: "Groq LPU inference runs roughly 10x faster than standard GPT, so your answer is on screen before you even hesitate.",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
];

export default function EnterpriseSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <BlurFade className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 mb-5">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enterprise Ready</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">
            Works everywhere. <span style={{ background: "linear-gradient(135deg,#6d28d9,#ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Invisible always.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Native integrations with every major interview platform. Zero setup. Zero footprint.
          </p>
        </BlurFade>

        {/* Platform grid */}
        <div ref={ref} className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-16">
          {PLATFORMS.map((p, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200 cursor-default group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm group-hover:scale-110 transition-transform"
                style={{ background: p.color }}>
                {p.icon}
              </div>
              <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{p.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Trust pillars */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl border ${t.border} ${t.bg} p-6`}>
              <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 ${t.color}`}>
                {t.icon}
              </div>
              <h3 className="text-sm font-black text-gray-900 mb-1.5">{t.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom compliance bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 py-5 border-t border-gray-100">
          {[
            { label: "End-to-End Encrypted", icon: "🔒" },
            { label: "GDPR Compliant",        icon: "🇪🇺" },
            { label: "No Data Resale",         icon: "🚫" },
            { label: "SOC 2 Type II",          icon: "✅" },
            { label: "99.9% Uptime SLA",       icon: "⚡" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
