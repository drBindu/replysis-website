"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BlurFade } from "./shared";
import Link from "next/link";

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
    title: "Raw audio is not stored",
    desc: "Audio streams to the speech-to-text provider. Replysis application servers do not store the raw audio file.",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    border: "border-zinc-200",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Desktop capture controls",
    desc: "OS-level controls target standard capture paths. Coverage varies, so test the exact operating system and meeting tool first.",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    border: "border-zinc-200",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Transparent data flow",
    desc: "Transcripts and resume context are processed to generate answers. Saved session history remains in your account until deletion.",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    border: "border-zinc-200",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Fast streaming responses",
    desc: "Answer suggestions stream as they are generated, with the live experience designed around a sub-two-second response target.",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    border: "border-zinc-200",
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
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Built with clear boundaries</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">
            Broad compatibility. <span style={{ background: "linear-gradient(135deg,#1C7A3E,#21924A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Honest by design.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Designed to work alongside major meeting and interview platforms, with clear privacy and capture limitations.
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

        {/* Bottom trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#1f6f3d]/10 bg-[#f8fbf8] px-6 py-5">
          <div>
            <p className="text-sm font-black text-gray-900">Read the exact security and data-handling posture</p>
            <p className="mt-1 text-xs text-gray-500">No unverified certification badges. No hidden limitations.</p>
          </div>
          <Link href="/trust" className="rounded-full bg-[#1C7A3E] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#155f30]">
            Open Trust Center →
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
