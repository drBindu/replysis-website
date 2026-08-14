"use client";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

function FeatureRow({
  flip, tag, tagColor, headline, sub, desc, stats, cta, path, mockup, gradient, onNav, isPrimary
}: any) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden bg-white">
      <div className="absolute pointer-events-none"
        style={{
          width: 600, height: 600, borderRadius: "50%", filter: "blur(120px)", opacity: 0.12,
          background: gradient,
          top: flip ? "auto" : "50%", bottom: flip ? "50%" : "auto",
          left: flip ? "auto" : "-10%", right: flip ? "-10%" : "auto",
          transform: "translateY(-50%)"
        }} />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <div className="max-w-6xl mx-auto relative">
        <div className={`flex flex-col ${flip ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-16`}>

          <motion.div className="flex-1"
            initial={{ opacity: 0, x: flip ? 40 : -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <span className={`inline-block text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-6 ${tagColor}`}>{tag}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 leading-tight">{headline}</h2>
            <p className="text-lg text-gray-600 font-medium mb-3">{sub}</p>
            <p className="text-gray-500 leading-relaxed mb-8 max-w-lg">{desc}</p>
            <div className="flex gap-8 mb-10">
              {stats.map((s: any, i: number) => (
                <div key={i}>
                  <div className="text-2xl font-black text-gray-900">{s.n}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            <style>{`
              @keyframes shine {
                0% { transform: translateX(-100%) skewX(-15deg); }
                100% { transform: translateX(250%) skewX(-15deg); }
              }
              .btn-shine::after {
                content: '';
                position: absolute;
                top: 0; left: 0;
                width: 40%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
                animation: shine 2.5s ease-in-out infinite;
              }
            `}</style>

            {isPrimary ? (
              <button onClick={() => onNav(path)}
                className="btn-shine relative overflow-hidden inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-900 shadow-lg shadow-zinc-800/40 transition-all duration-200 group">
                {cta}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button onClick={() => onNav(path)}
                className="btn-shine relative overflow-hidden inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-900 shadow-lg shadow-zinc-800/40 transition-all duration-200 group">
                {cta}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </motion.div>

          <motion.div className="flex-1 w-full" style={{ y }}
            initial={{ opacity: 0, x: flip ? -40 : 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}>
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-zinc-800/70" />
                <div className="ml-3 flex-1 bg-white/5 rounded-md h-5 flex items-center px-3">
                  <span className="text-[10px] text-gray-500">Replysis  -  {tag}</span>
                </div>
              </div>
              <div className="bg-gray-900 p-6 min-h-[260px] space-y-3">
                {mockup.map((line: any, i: number) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    className={`flex items-start gap-3 ${line.highlight ? "bg-white/5 rounded-lg px-3 py-2" : ""}`}>
                    {line.icon && <span className="text-lg flex-shrink-0">{line.icon}</span>}
                    <div>
                      {line.label && <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{line.label}</p>}
                      <p className={`text-sm font-medium ${line.accent ? "text-zinc-600" : line.dim ? "text-gray-500" : "text-gray-200"}`}>{line.text}</p>
                    </div>
                    {line.badge && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800/20 text-zinc-600 flex-shrink-0">{line.badge}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

export default function WhatIsItSection({ onNav }: { onNav: (p: string) => void }) {
  return (
    <>
      <FeatureRow
        flip={false}
        onNav={onNav}
        path="resume"
        isPrimary={true}
        tag="Resume Builder"
        tagColor="text-zinc-600 bg-zinc-800/10 border-zinc-800/30"
        headline={"Your resume,\nprofessionally rebuilt."}
        sub="Build a clearer, role-aware resume draft."
        desc="Paste your experience and choose a target role. Replysis helps restructure bullets, surface relevant keywords, and create a polished draft you can verify before downloading."
        stats={[{ n: "Role", l: "aware" }, { n: "PDF", l: "download" }, { n: "AI", l: "assisted" }]}
        cta="Build My Resume"
        gradient="radial-gradient(circle, #2E8B45, transparent)"
        mockup={[
          { icon: "👤", label: "Input", text: "Pavan Sharma, Software Engineer, 3 years at startup" },
          { icon: "⚙️", label: "Processing", text: "Analyzing role: Senior SWE @ Google...", dim: true },
          { icon: "✅", label: "Keyword review", text: "Role-aligned terms and missing context identified", accent: true, badge: "Review" },
          { icon: "📄", label: "Output", text: "A tailored draft ready for your final fact-check.", highlight: true },
        ]}
      />
      <div className="h-px bg-gray-100" />
      <FeatureRow
        flip={true}
        onNav={onNav}
        path="mock-interview"
        isPrimary={false}
        tag="Mock Interview"
        tagColor="text-zinc-600 bg-zinc-800/10 border-zinc-800/30"
        headline={"Practice until\nnerves are gone."}
        sub="Rehearse the hard questions before they count."
        desc="Generate behavioral, technical, and role-aware questions. Practice each response, then use structured AI feedback to decide what to improve."
        stats={[{ n: "Role", l: "aware" }, { n: "AI", l: "feedback" }, { n: "Saved", l: "review" }]}
        cta="Start Practicing Free"
        gradient="radial-gradient(circle, #A04E2C, transparent)"
        mockup={[
          { icon: "🎯", label: "Question", text: '"Tell me about a time you led a project under pressure."' },
          { icon: "🎤", label: "Your Answer", text: "Recording... (1m 32s)", dim: true },
          { icon: "📊", label: "Score", text: "8.4 / 10: Strong structure, good metrics", accent: true, badge: "Good" },
          { icon: "💡", label: "Coaching Tip", text: "Add a specific business impact number to seal it.", highlight: true },
        ]}
      />
      <div className="h-px bg-gray-100" />
      <FeatureRow
        flip={false}
        onNav={onNav}
        path="real-interview"
        isPrimary={false}
        tag="Live Interview Copilot"
        tagColor="text-zinc-600 bg-zinc-800/10 border-zinc-800/30"
        headline={"Live guidance,\nkept on your screen."}
        sub="Resume-grounded suggestions designed for fast delivery."
        desc="During a live session, Replysis transcribes the question, uses your resume for context, and streams an answer suggestion to the desktop overlay. Standard capture exclusion depends on your setup, so test it before the call."
        stats={[{ n: "<2s", l: "response target" }, { n: "OS", l: "capture controls" }, { n: "Live", l: "streaming" }]}
        cta="Try Live Copilot"
        gradient="radial-gradient(circle, #21924A, transparent)"
        mockup={[
          { icon: "🎤", label: "Listening", text: "Interview audio detected, processing...", dim: true },
          { icon: "❓", label: "Question Detected", text: '"Why should we hire you over other candidates?"' },
          { icon: "⚡", label: "Response", text: "Streaming answer suggestion...", accent: true, badge: "Live" },
          { icon: "🛡️", label: "Capture Status", text: "Standard capture exclusion enabled", highlight: true },
        ]}
      />
    </>
  );
}
