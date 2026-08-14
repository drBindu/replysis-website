"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BlurFade } from "./shared";
import {
  EyeOff, FileText, Zap, Monitor, MessageSquare,
  FilePen, ShieldCheck, AppWindow, Target, Brain
} from "lucide-react";

type FeatureIcon = typeof EyeOff;

const FEATURES: { Icon: FeatureIcon; title: string; desc: string; color: string; iconBg: string; iconColor: string; badge?: string }[] = [
  { Icon: EyeOff,        title: "Desktop Capture Controls", desc: "OS-level controls are designed to exclude the overlay from standard capture paths on supported setups.",     color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white", badge: "Desktop" },
  { Icon: FileText,      title: "Resume-Grounded Answers", desc: "Answers use the resume, role, and job context you provide so suggestions are specific to your background.",      color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
  { Icon: Zap,           title: "Fast Streaming",          desc: "Answer suggestions begin streaming as they generate, with a sub-two-second response target for live use.",    color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white", badge: "Live" },
  { Icon: Monitor,       title: "Major Platform Support",  desc: "Designed to work alongside Zoom, Google Meet, Teams, Webex, HireVue, and other audio-based workflows.",       color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
  { Icon: MessageSquare, title: "Mock Interview Mode",     desc: "Generate role-aware questions, practice your delivery, and receive structured feedback after each answer.",    color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
  { Icon: FilePen,       title: "Smart Resume Builder",    desc: "Build an ATS-optimized resume in minutes, then use it to power your live interview answers.",                  color: "bg-zinc-100 border-zinc-200",       iconBg: "bg-zinc-800",     iconColor: "text-white" },
  { Icon: ShieldCheck,   title: "Privacy Controls",        desc: "Replysis does not store raw audio. The Trust Center explains AI processing and saved session data clearly.",  color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
  { Icon: AppWindow,     title: "Native Desktop App",      desc: "Windows and macOS apps provide system audio and capture controls unavailable in a normal browser tab.",      color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
  { Icon: Target,        title: "Role-Specific Context",   desc: "Tune suggestions for software, product, data, marketing, and other roles using your target job context.",    color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
];

export default function FeaturesSection() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <>
      {/* ── Features grid ── */}
      <section id="features" className="py-28 px-6 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <BlurFade className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-300 bg-zinc-100 mb-5">
              <Brain className="w-3 h-3 text-zinc-800" />
              <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">AI-Powered Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Everything you need to win.</h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">One connected workspace to prepare your materials, practice your delivery, and get live answer support.</p>
          </BlurFade>

          <div ref={ref} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 60, scale: 0.90 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.65, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className={`relative rounded-2xl border-2 ${f.color} p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
                {f.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ background: "linear-gradient(135deg,#1C7A3E,#21924A)", color: "white" }}>
                      {f.badge}
                    </span>
                  </div>
                )}
                <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <f.Icon className={`w-5 h-5 ${f.iconColor}`} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-black text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
