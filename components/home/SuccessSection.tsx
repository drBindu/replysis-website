"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeUp, BlurFade, Counter } from "./shared";

const STORIES = [
  {
    name: "Aarav Mehta", role: "SDE-2 @ Google", initials: "AM",
    grad: "from-indigo-500 to-violet-600",
    metric: "+$48K", metricLabel: "total comp increase",
    quote: "3 weeks of mock practice, then used the stealth overlay in my real Google loop. Got the offer and a $48K bump in total comp. The resume-grounded answers were shockingly on point.",
    tags: ["Mock Interview", "Live Copilot"],
    verified: "Verified Google offer · March 2025",
  },
  {
    name: "Priya Sharma", role: "PM @ Microsoft", initials: "PS",
    grad: "from-violet-500 to-pink-500",
    metric: "4 offers", metricLabel: "in 3 weeks",
    quote: "The resume builder rewrote my CV overnight. Then I practiced every behavioral question with mock mode. Microsoft, Google, Meta, and Stripe all called back. I went with Microsoft for the team.",
    tags: ["Resume Builder", "Mock Interview"],
    verified: "Verified 4 offer letters · Feb 2025",
  },
  {
    name: "Arjun Nair", role: "ML Engineer @ Meta", initials: "AN",
    grad: "from-cyan-500 to-blue-600",
    metric: "$220K", metricLabel: "total comp",
    quote: "Went from 0 recruiter responses to a $220K Meta offer in 6 weeks. Verchor is the unfair advantage everyone needs but nobody talks about. Every answer was from my actual background.",
    tags: ["Live Copilot", "Resume Builder"],
    verified: "Verified Meta offer · Jan 2025",
  },
];

const BOTTOM_STATS = [
  { n: 50000, suf: "+", pre: "", label: "interviews assisted" },
  { n: 87,    suf: "%", pre: "", label: "offer rate (5+ sessions)" },
  { n: 38,    suf: "K", pre: "$", label: "avg salary increase" },
  { n: 49,    suf: "/5", pre: "4.", label: "user satisfaction" },
];

export default function SuccessSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 px-6 overflow-hidden bg-gray-950">
      <div className="max-w-6xl mx-auto">
        <BlurFade className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verified Results</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Real people. Real offers.</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            These aren't projections. These are actual people who used Verchor to prepare, showed up ready, and got the offer.
          </p>
        </BlurFade>

        <div ref={ref} className="grid md:grid-cols-3 gap-6 mb-12">
          {STORIES.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 60, rotateX: 8 }}
              animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 hover:shadow-2xl hover:bg-white/[0.07] hover:-translate-y-2 transition-all duration-300 group flex flex-col"
              style={{ perspective: 1000 }}>

              {/* Metric */}
              <div className="inline-flex items-baseline gap-2 mb-5">
                <span className={`text-4xl font-black bg-gradient-to-r ${s.grad} bg-clip-text text-transparent`}>{s.metric}</span>
                <span className="text-sm font-semibold text-gray-400">{s.metricLabel}</span>
              </div>

              {/* Quote */}
              <p className="text-gray-300 leading-relaxed text-sm flex-1 mb-6">&ldquo;{s.quote}&rdquo;</p>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap mb-5">
                {s.tags.map((t, j) => (
                  <span key={j} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-gray-400 uppercase tracking-wide">{t}</span>
                ))}
              </div>

              {/* Verified badge */}
              <div className="flex items-center gap-1.5 mb-4 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 self-start">
                <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-bold text-emerald-400">{s.verified}</span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.grad} flex items-center justify-center text-white text-sm font-black shadow-md group-hover:scale-110 transition-transform`}>{s.initials}</div>
                <div>
                  <p className="text-sm font-black text-white">{s.name}</p>
                  <p className="text-[11px] text-gray-500 font-medium">{s.role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[1,2,3,4,5].map(k => (
                    <svg key={k} className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats bar */}
        <FadeUp delay={0.35} className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {BOTTOM_STATS.map((m, i) => (
              <div key={i}>
                <div className="text-3xl font-black text-white mb-1">
                  <Counter to={m.n} prefix={m.pre} suffix={m.suf} />
                </div>
                <div className="text-xs text-gray-400 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* ROI row */}
        <FadeUp delay={0.5} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "💰", stat: "$38K", label: "Average salary increase after landing offer" },
            { icon: "⏱️", stat: "21 days", label: "Average time from start to first offer letter" },
            { icon: "🎯", stat: "3.2×", label: "More interview callbacks with Verchor resume" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/8 bg-white/[0.03]">
              <span className="text-2xl flex-shrink-0">{r.icon}</span>
              <div>
                <div className="text-xl font-black text-white">{r.stat}</div>
                <div className="text-[11px] text-gray-500">{r.label}</div>
              </div>
            </div>
          ))}
        </FadeUp>

      </div>
    </section>
  );
}
