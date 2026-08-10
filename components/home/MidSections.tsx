"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeUp, FadeIn, BlurFade, Counter, COMPANIES_ROW1, COMPANIES_ROW2 } from "./shared";

/* ── TRUSTED BY ─────────────────────────────────────────────── */
export function TrustedBySection() {
  const row1 = [...COMPANIES_ROW1, ...COMPANIES_ROW1, ...COMPANIES_ROW1];
  const row2 = [...COMPANIES_ROW2, ...COMPANIES_ROW2, ...COMPANIES_ROW2];
  return (
    <section className="py-16 bg-white border-y border-gray-100 overflow-hidden">
      <style>{`
        @keyframes tickerLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes tickerRight {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .ticker-left  { animation: tickerLeft  28s linear infinite; }
        .ticker-right { animation: tickerRight 36s linear infinite; }
        .ticker-left:hover,
        .ticker-right:hover { animation-play-state: paused; }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 mb-10">
        <FadeIn>
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Now in early access</span>
            </span>
            <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em]">
              Built to help you interview at
            </p>
          </div>
        </FadeIn>
      </div>

      <FadeUp delay={0.1}>
        <div className="relative space-y-3">
          <div className="flex ticker-left gap-3 w-max">
            {row1.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500 whitespace-nowrap flex-shrink-0 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-sm transition-all cursor-default select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                {c}
              </span>
            ))}
          </div>
          <div className="flex ticker-right gap-3 w-max">
            {row2.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500 whitespace-nowrap flex-shrink-0 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-sm transition-all cursor-default select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                {c}
              </span>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-28 pointer-events-none" style={{ background: "linear-gradient(to right, #ffffff, transparent)" }} />
          <div className="absolute inset-y-0 right-0 w-28 pointer-events-none" style={{ background: "linear-gradient(to left, #ffffff, transparent)" }} />
        </div>
      </FadeUp>
    </section>
  );
}

/* ── STATS ──────────────────────────────────────────────────── */
export function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const stats = [
    { to: 2,   suf: "s",  pre: "<", label: "Answer Speed",     sub: "streamed live to your screen", accent: "text-zinc-900", border: "border-zinc-800/20", bg: "bg-zinc-100", glow: "rgba(31,138,62,0.12)" },
    { to: 100, suf: "%",  pre: "",  label: "Private",          sub: "zero audio ever stored",       accent: "text-zinc-900", border: "border-zinc-800/20", bg: "bg-zinc-100", glow: "rgba(31,138,62,0.12)" },
    { to: 10,  suf: "x",  pre: "",  label: "Faster Inference", sub: "Groq LPU vs typical GPT",      accent: "text-zinc-900", border: "border-zinc-800/20", bg: "bg-zinc-100", glow: "rgba(31,138,62,0.12)" },
    { to: 24,  suf: "/7", pre: "",  label: "Always Ready",     sub: "whenever your interview is",   accent: "text-zinc-900", border: "border-zinc-800/20", bg: "bg-zinc-100", glow: "rgba(33,146,74,0.12)" },
  ];
  return (
    <section className="py-28 px-6 overflow-hidden" style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)" }}>
      <div className="max-w-5xl mx-auto">
        <BlurFade className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-300 bg-zinc-100 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse" />
            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Why It Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Engineered for the moment that matters.</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">Fast, private, and grounded in your real resume. No stored audio, no lag, no tells.</p>
        </BlurFade>
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 70, scale: 0.88 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl border-2 ${s.border} ${s.bg} p-7 text-center relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}
              style={{ boxShadow: `0 4px 24px ${s.glow}` }}>
              <div className={`text-4xl font-black ${s.accent} mb-1.5`}>
                <Counter to={s.to} suffix={s.suf} prefix={s.pre} />
              </div>
              <div className="text-sm font-black text-gray-800 mb-1">{s.label}</div>
              <div className="text-[11px] text-gray-500 font-medium">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Mini trust row below stats */}
        <FadeUp delay={0.5} className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { icon: "🎯", text: "Tailored to your role" },
            { icon: "⚡", text: "Groq LPU runs 10x faster than GPT" },
            { icon: "🔒", text: "Zero data stored" },
            { icon: "🌍", text: "Works in 40+ countries" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
              <span className="text-base">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </FadeUp>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ───────────────────────────────────────────── */
export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const steps = [
    {
      n: "01", icon: "📄", title: "Upload Your Resume",
      desc: "Paste your resume once. The system reads every project, skill, and achievement so every answer comes from your real background.",
      time: "30 seconds",
      color: "bg-zinc-900", border: "border-zinc-300 bg-zinc-100/50",
      accent: "text-zinc-900", ring: "ring-zinc-300",
    },
    {
      n: "02", icon: "🎤", title: "Start Your Interview",
      desc: "Open Replysis on desktop or web. It silently listens via mic, transcribes speech in real-time, and works invisibly on any platform.",
      time: "Zero setup",
      color: "bg-zinc-900", border: "border-zinc-300 bg-zinc-100/50",
      accent: "text-zinc-900", ring: "ring-zinc-300",
    },
    {
      n: "03", icon: "⚡", title: "Get Perfect Answers",
      desc: "Tailored answers stream to your stealth overlay in under 2 seconds. Invisible to screen-share. Just a confident you.",
      time: "Under 2 seconds",
      color: "bg-zinc-900", border: "border-zinc-300 bg-zinc-100/50",
      accent: "text-zinc-900", ring: "ring-zinc-300",
    },
  ];
  return (
    <section id="how-it-works" className="py-28 px-6 overflow-hidden bg-white">
      <div className="max-w-5xl mx-auto">
        <BlurFade className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 mb-5">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">How It Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">3 steps. Then you win.</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">No complex setup. Upload, open, ace your interview.</p>
        </BlurFade>
        <div ref={ref} className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] h-px"
            style={{ background: "linear-gradient(to right, #1C7A3E, #2E8B45, #21924A)" }} />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 70, scale: 0.93 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.75, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`relative rounded-2xl border-2 ${s.border} p-8 group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl`}>
                {/* Step number with ring */}
                <div className={`w-12 h-12 ${s.color} rounded-2xl flex items-center justify-center text-white font-black text-sm mb-6 shadow-lg ring-4 ${s.ring} relative z-10`}>
                  {s.n}
                </div>
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm mb-5">{s.desc}</p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.accent} bg-white border border-current/20`}>
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {s.time}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA ────────────────────────────────────────────────────── */
export function CtaSection({ onNav }: { onNav: (p: string) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section className="py-28 px-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)" }}>
      <div className="max-w-4xl mx-auto">
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="relative rounded-3xl overflow-hidden border border-zinc-300/60 p-12 md:p-16 text-center"
            style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.06) 0%, rgba(31,138,62,0.08) 50%, rgba(46,139,69,0.05) 100%)", boxShadow: "0 32px 80px rgba(31,138,62,0.12), 0 8px 24px rgba(0,0,0,0.04)" }}>

            {/* Background grid */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(rgba(31,138,62,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(31,138,62,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            {/* Top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
              style={{ background: "linear-gradient(to right, transparent, rgba(31,138,62,0.5), transparent)" }} />

            {/* Floating orbs */}
            <div className="absolute top-8 right-12 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(31,138,62,0.12) 0%, transparent 70%)", filter: "blur(20px)" }} />
            <div className="absolute bottom-8 left-12 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(31,138,62,0.12) 0%, transparent 70%)", filter: "blur(24px)" }} />

            <div className="relative z-10">

              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                The interview is the last barrier.<br />
                <span style={{ background: "linear-gradient(135deg, #1C7A3E 0%, #2E8B45 50%, #21924A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Let's make sure you clear it.
                </span>
              </h2>
              <p className="text-gray-600 text-lg max-w-xl mx-auto mb-3 leading-relaxed">
                Replysis listens live, reads your resume, and streams the answer in under two seconds, so you walk in ready to clear the one barrier between you and the offer.
              </p>
              <p className="text-gray-400 text-sm mb-10">Average user lands their target offer within <strong className="text-gray-600">3 weeks</strong> of starting.</p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.45, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
                  <button onClick={() => onNav("mock-interview")}
                    className="group relative overflow-hidden px-8 py-4 text-white font-black rounded-xl shadow-lg text-base transition-all active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg, #1C7A3E, #2E8B45, #21924A)", boxShadow: "0 8px 28px rgba(31,138,62,0.38)" }}>
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }} />
                    <span className="relative">Start for free →</span>
                  </button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
                  <button onClick={() => onNav("pricing")}
                    className="px-8 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-xl transition-all duration-300 text-base shadow-sm hover:shadow-md">
                    View pricing →
                  </button>
                </motion.div>
              </div>

              {/* Trust footer */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {["No credit card", "Free mock interviews", "Cancel anytime", "Zero audio stored"].map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <svg className="w-3 h-3 text-zinc-800 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
