"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BlurFade } from "./shared";

const STRENGTHS = [
  {
    metric: "1.8s",
    unit: "avg response",
    title: "Faster than your next thought",
    body: "We built on Groq's LPU hardware because speed is not a nice-to-have in a live interview. Your answer appears before the interviewer finishes the question. Not close to real-time. Actually real-time.",
    tag: "Groq LPU inference",
    color: "text-zinc-600",
    glow: "rgba(26,102,48,0.12)",
    border: "rgba(26,102,48,0.18)",
  },
  {
    metric: "99%+",
    unit: "transcription accuracy",
    title: "Every word. Every time.",
    body: "One missed word can produce a completely wrong answer. We use Deepgram and Speechmatics because we tested everything and they are simply the most accurate. What you say is what we hear.",
    tag: "Deepgram + Speechmatics",
    color: "text-zinc-600",
    glow: "rgba(26,102,48,0.10)",
    border: "rgba(26,102,48,0.18)",
  },
  {
    metric: "100%",
    unit: "answers from your resume",
    title: "Your story. Not a template.",
    body: "Before your interview starts, we read your entire background. The projects you shipped. The numbers you drove. The roles you held. Every answer we surface comes directly from your real experience, not from a generic script.",
    tag: "Resume-grounded context",
    color: "text-zinc-600",
    glow: "rgba(26,102,48,0.10)",
    border: "rgba(26,102,48,0.18)",
  },
  {
    metric: "0%",
    unit: "visible on screen recordings",
    title: "Invisible where it matters most",
    body: "We built at the operating system level so our overlay cannot appear in screen recordings, shared screens, or proctoring software. We tested every major platform. You will not be caught. That is a promise, not a claim.",
    tag: "OS-level stealth",
    color: "text-zinc-600",
    glow: "rgba(26,102,48,0.09)",
    border: "rgba(26,102,48,0.18)",
  },
  {
    metric: "8+",
    unit: "platforms supported",
    title: "Works wherever your interview is",
    body: "Zoom, Google Meet, Teams, Webex, HireVue, Slack, phone screens, in-person with a laptop. If your interview has audio, Verchor is already there. You pick the platform and we show up.",
    tag: "All major platforms",
    color: "text-zinc-600",
    glow: "rgba(26,102,48,0.09)",
    border: "rgba(26,102,48,0.18)",
  },
  {
    metric: "STAR",
    unit: "format, every answer",
    title: "Answers that interviewers actually want",
    body: "We do not give you bullet points to read aloud. Every answer is structured, specific, and ready to deliver. Situation, task, action, result. Experienced interviewers know the difference between a coached answer and a confident one. Yours will sound like the latter.",
    tag: "Structured answers",
    color: "text-zinc-600",
    glow: "rgba(26,102,48,0.09)",
    border: "rgba(26,102,48,0.18)",
  },
];

export default function WhyUsSection() {
  const headRef = useRef(null);
  const gridRef = useRef(null);
  const headIn  = useInView(headRef, { once: true, margin: "-60px" });
  const gridIn  = useInView(gridRef, { once: true, margin: "-60px" });

  return (
    <section className="py-28 px-6 bg-[#FAFAF9] overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div ref={headRef} className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={headIn ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-100 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Why Verchor</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headIn ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.07 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-5 tracking-tight leading-[1.08]">
            We didn't build<br className="hidden md:block" /> another AI chatbot.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={headIn ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.14 }}
            className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            We built the fastest, most accurate interview co-pilot that actually knows who you are. Speed, precision, and your own voice, delivered in under two seconds.
          </motion.p>
        </div>

        {/* Strength cards */}
        <div ref={gridRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STRENGTHS.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={gridIn ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              className="group relative rounded-2xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{
                background: `radial-gradient(circle at 0% 0%, ${s.glow} 0%, transparent 60%), rgba(26,102,48,0.02)`,
                border: `1px solid ${s.border}`,
              }}>

              {/* Metric */}
              <div className="mb-5">
                <div className={`text-4xl font-black ${s.color} leading-none mb-1`}>{s.metric}</div>
                <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest">{s.unit}</div>
              </div>

              {/* Title */}
              <h3 className="text-[17px] font-black text-gray-900 mb-3 leading-snug">{s.title}</h3>

              {/* Body */}
              <p className="text-[13.5px] text-gray-500 leading-[1.7] flex-1">{s.body}</p>

              {/* Tech tag */}
              <div className="mt-5 pt-4 border-t border-gray-200">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${s.color} opacity-70`}>
                  {s.tag}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={gridIn ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.58 }}
          className="mt-12 rounded-2xl px-8 py-10 text-center"
          style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.08) 0%, rgba(31,138,62,0.05) 100%)", border: "1px solid rgba(31,138,62,0.14)" }}>
          <p className="text-gray-900 text-xl md:text-2xl font-black mb-2 leading-snug">
            The goal was simple from day one.
          </p>
          <p className="text-gray-500 text-[15px] max-w-xl mx-auto leading-relaxed">
            Walk into any interview, for any company, on any platform, and answer every question with the confidence of someone who has done it a hundred times. That is what Verchor gives you.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
