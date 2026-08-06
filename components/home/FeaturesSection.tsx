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
  { Icon: EyeOff,        title: "Stealth Overlay",        desc: "Invisible to screen-share on Zoom, Teams, Meet. Your secret weapon during real interviews.",                    color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white", badge: "Most Popular" },
  { Icon: FileText,      title: "Resume-Grounded Answers", desc: "Every answer uses your actual experience and projects. Zero generic filler, ever.",                             color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
  { Icon: Zap,           title: "Sub-2-Second Speed",      desc: "Groq LPU inference streams the perfect answer before you even finish thinking about it.",                      color: "bg-zinc-100 border-zinc-200",     iconBg: "bg-zinc-800",    iconColor: "text-white", badge: "10× Faster" },
  { Icon: Monitor,       title: "Any Platform",            desc: "Works with Zoom, Google Meet, Teams, Webex, HireVue, anything that uses your microphone.",                     color: "bg-zinc-100 border-zinc-200",         iconBg: "bg-zinc-800",      iconColor: "text-white" },
  { Icon: MessageSquare, title: "Mock Interview Mode",     desc: "200+ tailored questions for your exact role. Practice until every answer is pitch-perfect.",                   color: "bg-zinc-100 border-zinc-200", iconBg: "bg-zinc-800",  iconColor: "text-white" },
  { Icon: FilePen,       title: "Smart Resume Builder",    desc: "Build an ATS-optimized resume in minutes, then use it to power your live interview answers.",                  color: "bg-zinc-100 border-zinc-200",       iconBg: "bg-zinc-800",     iconColor: "text-white" },
  { Icon: ShieldCheck,   title: "100% Private",            desc: "Audio never stored. Text-only prompts sent for processing. Zero conversation logs. Your data stays yours.",   color: "bg-zinc-100 border-zinc-200",       iconBg: "bg-zinc-800",     iconColor: "text-white" },
  { Icon: AppWindow,     title: "Native Desktop App",      desc: "Windows + Mac native apps. System audio capture for true stealth. Zero browser limitations.",                 color: "bg-zinc-100 border-zinc-200",       iconBg: "bg-zinc-800",     iconColor: "text-white" },
  { Icon: Target,        title: "Role-Specific Answers",   desc: "SWE, PM, Data Science, Marketing. Answers precision-tuned for your exact target role.",                       color: "bg-zinc-100 border-zinc-200",   iconBg: "bg-zinc-800",   iconColor: "text-white" },
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
            <p className="text-gray-500 text-lg max-w-lg mx-auto">Every feature was built because a real user needed it to land their dream job.</p>
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
