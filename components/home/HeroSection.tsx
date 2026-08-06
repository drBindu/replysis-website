"use client";
import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";

interface Props {
  mounted: boolean;
  detectedOS: "win" | "mac" | "other";
  onDownload: (os: "win" | "mac") => void;
  onNav: (path: string) => void;
}

function WinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  );
}
function MacIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

/* Magnetic wrapper — child drifts toward the cursor while hovered */
function Magnetic({ children, strength = 0.4, className = "" }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mvx = useMotionValue(0);
  const mvy = useMotionValue(0);
  const sx = useSpring(mvx, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(mvy, { stiffness: 220, damping: 16, mass: 0.4 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mvx.set((e.clientX - (r.left + r.width / 2)) * strength);
    mvy.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { mvx.set(0); mvy.set(0); };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={{ x: sx, y: sy }} className={className}>
      {children}
    </motion.div>
  );
}

export function OSDownloadButtons({ detectedOS, mounted, onDownload, size = "default" }: {
  detectedOS: "win" | "mac" | "other"; mounted: boolean;
  onDownload: (os: "win" | "mac") => void; size?: "default" | "large";
}) {
  const cls = size === "large" ? "px-8 py-4 text-base rounded-2xl gap-3" : "px-5 py-2.5 text-sm rounded-xl gap-2";
  const btn = (os: "win" | "mac", primary: boolean) => (
    <button key={os} onClick={() => onDownload(os)}
      className={`flex items-center justify-center font-semibold border transition-all active:scale-[0.97] ${cls} ${
        primary ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-zinc-400 hover:text-zinc-900 shadow-sm"
      }`}
      style={primary ? { background: "linear-gradient(135deg,#21924A,#21924A)", boxShadow: "0 6px 24px rgba(31,138,62,0.32)" } : undefined}>
      {os === "win" ? <WinIcon className="w-4 h-4 flex-shrink-0" /> : <MacIcon className="w-4 h-4 flex-shrink-0" />}
      <span>{os === "win" ? "Download for Windows" : "Download for macOS"}</span>
      {primary && <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full">FREE</span>}
    </button>
  );
  if (!mounted) return <div className="flex gap-3">{btn("win", true)}</div>;
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Show ONLY the visitor's own OS. Only fall back to showing both
          when the OS is unknown (Linux / mobile / unrecognized). */}
      {detectedOS === "mac" ? btn("mac", true)
        : detectedOS === "win" ? btn("win", true)
        : <>{btn("win", true)}{btn("mac", false)}</>}
    </div>
  );
}

/* Waveform heights/timings  -  fixed values, SSR safe */
const WAVE = [
  {h:10,d:1.9,dl:0.0},{h:22,d:2.2,dl:0.15},{h:16,d:1.7,dl:0.4},{h:38,d:2.0,dl:0.1},
  {h:12,d:2.4,dl:0.6},{h:28,d:1.8,dl:0.3},{h:44,d:2.1,dl:0.05},{h:18,d:1.6,dl:0.5},
  {h:34,d:2.3,dl:0.2},{h:20,d:1.9,dl:0.7},{h:40,d:1.5,dl:0.35},{h:14,d:2.0,dl:0.55},
  {h:26,d:2.5,dl:0.1},{h:48,d:1.8,dl:0.45},{h:16,d:2.2,dl:0.25},{h:36,d:1.7,dl:0.6},
  {h:24,d:2.0,dl:0.0},{h:42,d:1.6,dl:0.5},{h:14,d:2.3,dl:0.3},{h:30,d:1.9,dl:0.15},
  {h:38,d:2.1,dl:0.7},{h:12,d:1.8,dl:0.4},{h:32,d:2.4,dl:0.2},{h:22,d:1.7,dl:0.55},
  {h:40,d:2.0,dl:0.1},{h:18,d:2.2,dl:0.35},{h:28,d:1.5,dl:0.6},{h:44,d:2.3,dl:0.05},
  {h:16,d:1.9,dl:0.45},{h:34,d:2.1,dl:0.3},{h:20,d:1.7,dl:0.15},{h:10,d:2.0,dl:0.5},
];

export default function HeroSection({ mounted, detectedOS, onDownload, onNav }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mockY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 60]), { stiffness: 60, damping: 20 });
  /* Scroll-linked hero exit: text drifts up + fades as you scroll into the page */
  const textY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -90]), { stiffness: 60, damping: 22 });
  const heroFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const mockScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  /* Scroll-driven 3D rotation for the app window (it turns + tilts as you scroll) */
  const mockRotX = useTransform(scrollYProgress, [0, 1], [13, 26]);
  const mockRotY = useTransform(scrollYProgress, [0, 1], [-9, 13]);

  /* Mouse parallax */
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 35, damping: 28 });
  const my = useSpring(rawY, { stiffness: 35, damping: 28 });
  const b1x = useTransform(mx, [-1, 1], [-28, 28]);
  const b1y = useTransform(my, [-1, 1], [-20, 20]);
  const b2x = useTransform(mx, [-1, 1], [20, -20]);
  const b2y = useTransform(my, [-1, 1], [14, -14]);
  const b3x = useTransform(mx, [-1, 1], [-12, 12]);
  const b3y = useTransform(my, [-1, 1], [8, -8]);
  /* 3D tilt for the product mockup (mouse-follow) */
  const tiltY = useTransform(mx, [-1, 1], [9, -9]);
  const tiltX = useTransform(my, [-1, 1], [-6, 6]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawX.set((e.clientX / window.innerWidth) * 2 - 1);
      rawY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return (
    <section ref={ref}
      className="relative min-h-screen flex items-center pt-[60px] overflow-hidden"
      style={{ background: "linear-gradient(150deg, #FEFEFC 0%, #F6F8F3 32%, #F4F7F1 68%, #FEFEFC 100%)" }}>

      {/* ── Living aurora — slow drifting green light ── */}
      <div aria-hidden className="absolute inset-[-15%] pointer-events-none"
        style={{ animation: "aurora-drift 24s ease-in-out infinite",
          background: "radial-gradient(30% 34% at 24% 30%, rgba(33,146,74,0.20), transparent 70%), radial-gradient(26% 30% at 80% 22%, rgba(46,139,69,0.14), transparent 70%), radial-gradient(36% 40% at 62% 88%, rgba(20,83,43,0.12), transparent 72%)" }} />

      {/* ── Mouse-parallax ambient blobs ── */}
      <motion.div className="absolute pointer-events-none"
        style={{ x: b1x, y: b1y, top: "-200px", left: "-180px", width: "700px", height: "700px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(31,138,62,0.26) 0%, rgba(31,138,62,0.08) 45%, transparent 68%)", filter: "blur(100px)" }} />
      <motion.div className="absolute pointer-events-none"
        style={{ x: b2x, y: b2y, top: "-80px", right: "-160px", width: "620px", height: "620px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(31,138,62,0.20) 0%, transparent 65%)", filter: "blur(90px)" }} />
      <motion.div className="absolute pointer-events-none"
        style={{ x: b3x, y: b3y, bottom: "-60px", left: "50%", marginLeft: "-400px", width: "800px", height: "450px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(31,138,62,0.12) 0%, transparent 68%)", filter: "blur(110px)" }} />

      {/* Waveform  -  thematic, barely visible */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.055 }}>
        <div className="flex items-end gap-[4px]">
          {WAVE.map((w, i) => (
            <motion.div key={i}
              animate={{ height: [6, w.h, 6] }}
              transition={{ duration: w.d, repeat: Infinity, ease: "easeInOut", delay: w.dl }}
              style={{ width: "3px", borderRadius: "99px", background: "linear-gradient(to top, #21924A, #21924A)" }}
            />
          ))}
        </div>
      </div>

      {/* Dot grid  -  texture only */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(31,138,62,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* ── Floating side cards — fill the left/right space with a live scene ── */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block z-[5]">
        {/* LEFT · Listening */}
        <motion.div initial={{ opacity: 0, x: -30, rotate: -6 }} animate={{ opacity: 1, x: 0, rotate: -5 }} transition={{ delay: 0.5, duration: 0.8, ease: [0.16,1,0.3,1] }}
          className="absolute left-[2.5%] top-[20%] w-[190px]">
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl bg-white/85 backdrop-blur-md border border-[#16150F]/[0.07] p-3.5" style={{ boxShadow: "0 20px 44px -18px rgba(22,21,15,0.28)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-lg bg-[#EEF7EF] flex items-center justify-center text-[10px] font-black text-[#1C7A3E]">HR</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Interviewer</span>
              <span className="ml-auto flex items-end gap-[2px] h-3">
                {[6,10,5,9,7].map((h,i)=>(<motion.span key={i} animate={{height:[3,h,3]}} transition={{duration:1+i*0.15,repeat:Infinity,ease:"easeInOut"}} className="w-[2px] rounded-full bg-[#21924A]" />))}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-snug">"Tell me about a time you led under pressure."</p>
          </motion.div>
        </motion.div>

        {/* LEFT · Resume loaded */}
        <motion.div initial={{ opacity: 0, x: -30, rotate: 5 }} animate={{ opacity: 1, x: 0, rotate: 4 }} transition={{ delay: 0.8, duration: 0.8, ease: [0.16,1,0.3,1] }}
          className="absolute left-[4%] bottom-[18%] w-[170px]">
          <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl bg-white/85 backdrop-blur-md border border-[#16150F]/[0.07] p-3.5 flex items-center gap-2.5" style={{ boxShadow: "0 20px 44px -18px rgba(22,21,15,0.28)" }}>
            <span className="w-8 h-8 rounded-xl bg-[#EEF7EF] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#1C7A3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </span>
            <div><p className="text-[11px] font-black text-gray-800 leading-tight">Resume loaded</p><p className="text-[9px] text-gray-400">Answers grounded in your story</p></div>
          </motion.div>
        </motion.div>

        {/* RIGHT · 1.8s response */}
        <motion.div initial={{ opacity: 0, x: 30, rotate: 6 }} animate={{ opacity: 1, x: 0, rotate: 5 }} transition={{ delay: 0.6, duration: 0.8, ease: [0.16,1,0.3,1] }}
          className="absolute right-[2.5%] top-[18%] w-[160px]">
          <motion.div animate={{ y: [0, 13, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl bg-white/85 backdrop-blur-md border border-[#16150F]/[0.07] p-3.5 flex items-center gap-2.5" style={{ boxShadow: "0 20px 44px -18px rgba(22,21,15,0.28)" }}>
            <span className="w-8 h-8 rounded-xl bg-[#EEF7EF] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#1C7A3E]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </span>
            <div><p className="text-[13px] font-black text-gray-900 leading-tight">1.8s</p><p className="text-[9px] text-gray-400">Answer on screen</p></div>
          </motion.div>
        </motion.div>

        {/* RIGHT · Stealth */}
        <motion.div initial={{ opacity: 0, x: 30, rotate: -5 }} animate={{ opacity: 1, x: 0, rotate: -4 }} transition={{ delay: 0.9, duration: 0.8, ease: [0.16,1,0.3,1] }}
          className="absolute right-[3.5%] bottom-[20%] w-[180px]">
          <motion.div animate={{ y: [0, -13, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl bg-white/85 backdrop-blur-md border border-[#16150F]/[0.07] p-3.5" style={{ boxShadow: "0 20px 44px -18px rgba(22,21,15,0.28)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-3.5 h-3.5 text-[#1C7A3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span className="text-[10px] font-black text-gray-800">Stealth Active</span>
            </div>
            <p className="text-[9px] text-gray-400 leading-snug">Invisible on screen-share &amp; recordings</p>
          </motion.div>
        </motion.div>
      </div>

      {/* ══════════════════ CENTERED EDITORIAL LAYOUT ══════════════════ */}
      <div className="relative w-full max-w-6xl mx-auto px-6 z-10 pt-24 pb-10 lg:pt-16">
        <div className="flex flex-col items-center gap-12">

          {/* ── Centered headline block + CTAs ── */}
          <motion.div style={{ y: textY, opacity: heroFade }} className="flex flex-col items-center text-center max-w-3xl mx-auto">

            {/* Announcement badge */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
              className="flex flex-col gap-2 mb-5 self-center">
              {/* New feature pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full self-center"
                style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.08), rgba(31,138,62,0.06))", border: "1px solid rgba(31,138,62,0.18)" }}>
                <span className="text-[9px] font-black text-zinc-900 uppercase tracking-widest bg-zinc-200 px-1.5 py-0.5 rounded-full">NEW</span>
                <span className="text-[11px] font-semibold text-gray-600">Screen Analysis + Multi-platform audio capture</span>
              </div>
              {/* Status pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-zinc-300/70 shadow-sm backdrop-blur-sm self-center">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-800 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-800" />
                </span>
                <span className="text-[11px] font-semibold text-gray-600 tracking-wide">
                  Real-Time &nbsp;·&nbsp; Stealth Mode &nbsp;·&nbsp; Sub-2s Response
                </span>
              </div>
            </motion.div>

            {/* Headline  -  tighter, more enterprise */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[2.9rem] md:text-[3.6rem] lg:text-[4.1rem] leading-[1.02] mb-5 text-[#16150F]">
              Ace every interview.
              <br />
              <span style={{ fontStyle: "italic", background: "linear-gradient(135deg, #1C7A3E 0%, #2E8B45 45%, #21924A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Land the offer.
              </span>
            </motion.h1>

            {/* Sub-headline  -  concise */}
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
              className="text-[1.05rem] text-[#4A4A41] leading-[1.7] mb-6 max-w-[440px]">
              Listens live, reads your resume, and delivers the{" "}
              <span className="text-[#1C7A3E] font-semibold">perfect answer in 1.8s</span>
              {" "}completely undetectable.
            </motion.p>

            {/* ── PRIMARY: Download buttons ── */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="flex flex-col gap-2 mb-3">

              {/* Button row: primary OS gets gradient, both shown when OS unknown */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Windows button — primary when on Windows, secondary when on Mac */}
                {(!mounted || detectedOS !== "mac") && (
                <Magnetic strength={0.3} className="sm:flex-none">
                <motion.div className="relative" whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}>
                  {/* breathing attention glow — makes download the focal point */}
                  {(!mounted || detectedOS === "win" || detectedOS === "other") && (
                    <motion.span aria-hidden className="absolute -inset-2.5 rounded-[20px] pointer-events-none"
                      style={{ background: "radial-gradient(closest-side, rgba(33,146,74,0.55), rgba(33,146,74,0) 78%)", filter: "blur(12px)" }}
                      animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.97, 1.05, 0.97] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
                  )}
                  <button onClick={() => onDownload("win")}
                    className="group relative w-full flex items-center gap-3.5 px-8 py-[1.15rem] rounded-2xl text-white font-bold overflow-hidden"
                    style={
                      !mounted || detectedOS === "win" || detectedOS === "other"
                        ? { background: "linear-gradient(135deg, #1C7A3E 0%, #2E8B45 50%, #21924A 100%)", boxShadow: "0 14px 40px rgba(31,138,62,0.45), 0 4px 12px rgba(31,138,62,0.22)" }
                        : { background: "linear-gradient(135deg, #1C7A3E 0%, #21924A 100%)", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }
                    }>
                    {/* auto-running shimmer sweep */}
                    <motion.span className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.30) 50%, transparent 70%)", width: "60%" }}
                      animate={{ x: ["-80%", "220%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }} />
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "linear-gradient(135deg, #14532B 0%, #21924A 50%, #14532B 100%)" }} />
                    <WinIcon className="w-6 h-6 relative flex-shrink-0" />
                    <span className="relative text-left leading-tight">
                      <span className="block text-[10px] font-medium opacity-75 mb-0.5 uppercase tracking-wider">Download free for</span>
                      <span className="block text-[17px] font-black">Windows</span>
                    </span>
                    <span className="relative ml-auto flex items-center gap-1.5">
                      <span className="text-[10px] font-black bg-white/25 px-2.5 py-0.5 rounded-full">FREE</span>
                      <motion.svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </span>
                  </button>
                </motion.div>
                </Magnetic>
                )}

                {/* macOS button — primary when on Mac, secondary when on Windows */}
                {(!mounted || detectedOS !== "win") && (
                <button onClick={() => onDownload("mac")}
                  className="group relative flex items-center gap-3 px-6 py-4 rounded-xl text-white font-bold overflow-hidden transition-all active:scale-[0.97] sm:flex-none"
                  style={
                    mounted && detectedOS === "mac"
                      ? { background: "linear-gradient(135deg, #1C7A3E 0%, #2E8B45 100%)", boxShadow: "0 8px 28px rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.10)" }
                      : { background: "linear-gradient(135deg, #1C7A3E 0%, #21924A 100%)", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }
                  }>
                  {mounted && detectedOS === "mac" && (
                    <motion.span className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)", width: "60%" }}
                      animate={{ x: ["-80%", "220%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }} />
                  )}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #21924A, #2E8B45)" }} />
                  <MacIcon className="w-5 h-5 relative flex-shrink-0 text-gray-300" />
                  <span className="relative text-left leading-tight">
                    <span className="block text-[9px] font-medium opacity-55 mb-0.5 uppercase tracking-wider">Download for</span>
                    <span className="block text-[15px] font-black">macOS</span>
                  </span>
                  <span className="relative ml-auto flex items-center gap-1">
                    <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full text-gray-400">FREE</span>
                    <svg className="w-3.5 h-3.5 opacity-40 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                )}
              </div>

              {/* Secondary cross-platform nudge — always visible */}
              <div className="flex items-center gap-2">
                {mounted && detectedOS === "win" && (
                  <button onClick={() => onDownload("mac")}
                    className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition-colors group">
                    <MacIcon className="w-3 h-3 flex-shrink-0" />
                    <span>Also available for macOS</span>
                    <svg className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {mounted && detectedOS === "mac" && (
                  <button onClick={() => onDownload("win")}
                    className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition-colors group">
                    <WinIcon className="w-3 h-3 flex-shrink-0" />
                    <span>Also available for Windows</span>
                    <svg className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Free note + secondary CTA + trust micro-line */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="flex flex-col gap-2 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-zinc-800 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[11px] text-gray-500">Free forever</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-zinc-800 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[11px] text-gray-500">No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-zinc-800 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[11px] text-gray-500">Zero audio stored</span>
                </div>
                <div className="w-px h-3 bg-gray-200" />
                <button onClick={() => onNav("real-interview")}
                  className="text-[12px] font-semibold text-zinc-900 hover:text-zinc-950 transition-colors flex items-center gap-1 group">
                  Try in browser
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </motion.div>

            {/* Stats row  -  compact, below CTAs */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}
              className="flex items-center gap-6 mb-6 flex-wrap">
              {[
                { value: "1.8s",  label: "Response" },
                { value: "100%",  label: "Private" },
                { value: "Any",   label: "Platform" },
                { value: "Live",  label: "On-screen" },
              ].map((s, i) => (
                <div key={s.value} className="flex items-center gap-5">
                  {i > 0 && <div className="w-px h-7 bg-gray-200" />}
                  <div>
                    <div className="text-[1.15rem] font-black text-gray-900 tracking-tight leading-none">{s.value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Social proof — honest early-access framing */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Now in early access</span>
              </span>
              <p className="text-[11px] text-gray-400">
                Built for candidates targeting <span className="text-gray-700 font-semibold">Google, Amazon &amp; Microsoft</span>
              </p>
            </motion.div>

            {/* Works-on platform strip — adds real info + credibility */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62, duration: 0.6 }}
              className="mt-9 flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">Works seamlessly on</span>
              <div className="flex items-center gap-x-6 gap-y-2 flex-wrap justify-center max-w-xl">
                {["Zoom", "Google Meet", "Microsoft Teams", "Webex", "HireVue", "Phone screens"].map((p) => (
                  <motion.span key={p} whileHover={{ y: -3 }}
                    className="text-[13.5px] font-semibold text-gray-500 hover:text-[#1C7A3E] cursor-default transition-colors">
                    {p}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ── Product mockup — large, centered showcase below ── */}
          <motion.div style={{ y: mockY, scale: mockScale, rotateX: mockRotX, rotateY: mockRotY, transformPerspective: 1600, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl mx-auto will-change-transform">
          <motion.div animate={{ y: [0, -16, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}>

            {/* Glow behind window */}
            <div className="absolute inset-x-12 top-6 bottom-6 pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(31,138,62,0.16) 0%, transparent 70%)", filter: "blur(24px)" }} />

            <div className="relative rounded-[20px] overflow-hidden"
              style={{ border: "1px solid rgba(22,21,15,0.08)", boxShadow: "0 44px 100px -20px rgba(22,21,15,0.28), 0 18px 44px -24px rgba(22,21,15,0.20), 0 2px 8px rgba(22,21,15,0.04)" }}>

              {/* Window chrome bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100/80"
                style={{ background: "rgba(253,251,255,0.98)" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex items-center gap-2 ml-2 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center font-black text-[9px] text-white"
                    style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>CX</div>
                  <span className="text-[12px] font-semibold text-gray-700">Verchor</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-[11px] text-gray-400">Interview Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-mono">12:47</span>
                  <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-300 rounded-lg px-2.5 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse" />
                    <span className="text-[10px] text-zinc-900 font-bold tracking-wider">LIVE</span>
                  </div>
                </div>
              </div>

              {/* App body */}
              <div className="p-5 space-y-4" style={{ background: "linear-gradient(160deg, #ffffff 0%, #ffffff 100%)" }}>

                {/* Interviewer bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 text-[10px] font-bold">HR</span>
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Interviewer · Listening</p>
                    <p className="text-sm text-gray-700">"Tell me about a time you led a high-pressure project with a tight deadline."</p>
                  </div>
                </div>

                {/* AI response bubble */}
                <div className="flex items-start gap-3 pl-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white"
                    style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)", boxShadow: "0 0 12px rgba(31,138,62,0.28)" }}>AI</div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.055) 0%, rgba(31,138,62,0.035) 100%)", border: "1px solid rgba(31,138,62,0.16)" }}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-zinc-200/60">
                      <div className="flex items-end gap-[2.5px] h-4">
                        {[9,15,7,13,10,16,8,12].map((h, i) => (
                          <motion.div key={i}
                            animate={{ height: [4, h, 4] }}
                            transition={{ duration: 1.2 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                            style={{ width: "2px", borderRadius: "2px", background: "linear-gradient(to top, #1C7A3E, #21924A)" }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        Verchor · 1.8s
                      </span>
                      <div className="ml-auto flex items-center gap-1 bg-zinc-100 rounded-md px-2 py-0.5 border border-zinc-200">
                        <svg className="w-2.5 h-2.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <span className="text-[9px] text-zinc-900 font-semibold tracking-wide">STEALTH</span>
                      </div>
                    </div>
                    <p className="px-4 py-3.5 text-sm text-gray-700 leading-relaxed">
                      "In my previous role I led a 5-person cross-functional team delivering a critical API migration in 3 weeks, on time, with a{" "}
                      <span className="font-semibold text-zinc-900">40% latency reduction</span>."
                    </p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="px-1 pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Response Confidence</span>
                    <span className="text-[10px] font-black" style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>98%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "98%" }}
                      transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #1C7A3E, #21924A)" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge  -  stealth */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1, duration: 0.5, type: "spring" }}
              className="absolute -bottom-4 -left-6 bg-white rounded-xl px-4 py-2.5 flex items-center gap-2.5"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px solid rgba(31,138,62,0.12)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.12), rgba(31,138,62,0.10))" }}>
                <svg className="w-3.5 h-3.5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-800">Stealth Active</div>
                <div className="text-[9px] text-gray-400">Invisible to interviewer</div>
              </div>
            </motion.div>

            {/* Floating badge  -  speed */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.5, type: "spring" }}
              className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-2.5 flex items-center gap-2.5"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px solid rgba(31,138,62,0.12)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(31,138,62,0.12), rgba(31,138,62,0.08))" }}>
                <svg className="w-3.5 h-3.5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-800">1.8s Response</div>
                <div className="text-[9px] text-gray-400">Real-time answer</div>
              </div>
            </motion.div>
          </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
