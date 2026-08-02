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

export function OSDownloadButtons({ detectedOS, mounted, onDownload, size = "default" }: {
  detectedOS: "win" | "mac" | "other"; mounted: boolean;
  onDownload: (os: "win" | "mac") => void; size?: "default" | "large";
}) {
  const cls = size === "large" ? "px-8 py-4 text-base rounded-2xl gap-3" : "px-5 py-2.5 text-sm rounded-xl gap-2";
  const btn = (os: "win" | "mac", primary: boolean) => (
    <button key={os} onClick={() => onDownload(os)}
      className={`flex items-center justify-center font-semibold border transition-all active:scale-[0.97] ${cls} ${
        primary ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-700 shadow-sm"
      }`}
      style={primary ? { background: "linear-gradient(135deg,#7c3aed,#ea580c)", boxShadow: "0 6px 24px rgba(124,58,237,0.32)" } : undefined}>
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
      style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 30%, #fff4ec 70%, #fdf8ff 100%)" }}>

      {/* ── Mouse-parallax ambient blobs ── */}
      <motion.div className="absolute pointer-events-none"
        style={{ x: b1x, y: b1y, top: "-200px", left: "-180px", width: "700px", height: "700px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.26) 0%, rgba(109,40,217,0.08) 45%, transparent 68%)", filter: "blur(100px)" }} />
      <motion.div className="absolute pointer-events-none"
        style={{ x: b2x, y: b2y, top: "-80px", right: "-160px", width: "620px", height: "620px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(234,88,12,0.20) 0%, transparent 65%)", filter: "blur(90px)" }} />
      <motion.div className="absolute pointer-events-none"
        style={{ x: b3x, y: b3y, bottom: "-60px", left: "50%", marginLeft: "-400px", width: "800px", height: "450px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(147,51,234,0.12) 0%, transparent 68%)", filter: "blur(110px)" }} />

      {/* Waveform  -  thematic, barely visible */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.055 }}>
        <div className="flex items-end gap-[4px]">
          {WAVE.map((w, i) => (
            <motion.div key={i}
              animate={{ height: [6, w.h, 6] }}
              transition={{ duration: w.d, repeat: Infinity, ease: "easeInOut", delay: w.dl }}
              style={{ width: "3px", borderRadius: "99px", background: "linear-gradient(to top, #7c3aed, #ea580c)" }}
            />
          ))}
        </div>
      </div>

      {/* Dot grid  -  texture only */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* ══════════════════ TWO-COLUMN LAYOUT ══════════════════ */}
      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-14 z-10 py-10 lg:py-0">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-center">

          {/* ── LEFT: Text + CTAs ── */}
          <div className="flex flex-col">

            {/* Announcement badge */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
              className="flex flex-col gap-2 mb-5 self-start">
              {/* New feature pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full self-start"
                style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.08), rgba(234,88,12,0.06))", border: "1px solid rgba(109,40,217,0.18)" }}>
                <span className="text-[9px] font-black text-violet-600 uppercase tracking-widest bg-violet-100 px-1.5 py-0.5 rounded-full">NEW</span>
                <span className="text-[11px] font-semibold text-gray-600">Screen Analysis + Multi-platform audio capture</span>
              </div>
              {/* Status pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-violet-200/70 shadow-sm backdrop-blur-sm self-start">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
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
              className="text-[2.6rem] md:text-[3.2rem] lg:text-[3.6rem] font-black tracking-tight leading-[1.05] mb-4 text-gray-900">
              Ace every interview.
              <br />
              <span style={{ background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #ea580c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Land the offer.
              </span>
            </motion.h1>

            {/* Sub-headline  -  concise */}
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
              className="text-[1rem] text-gray-500 leading-relaxed mb-5 max-w-[420px]">
              Listens live, reads your resume, and delivers the{" "}
              <span className="text-violet-600 font-semibold">perfect answer in 1.8s</span>
              {" "}completely undetectable.
            </motion.p>

            {/* ── PRIMARY: Download buttons ── */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="flex flex-col gap-2 mb-3">

              {/* Button row: primary OS gets gradient, both shown when OS unknown */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Windows button — primary when on Windows, secondary when on Mac */}
                {(!mounted || detectedOS !== "mac") && (
                <button onClick={() => onDownload("win")}
                  className="group relative flex items-center gap-3 px-6 py-4 rounded-xl text-white font-bold overflow-hidden transition-all active:scale-[0.97] sm:flex-none"
                  style={
                    !mounted || detectedOS === "win" || detectedOS === "other"
                      ? { background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 50%, #ea580c 100%)", boxShadow: "0 8px 28px rgba(109,40,217,0.40), 0 2px 8px rgba(234,88,12,0.18)" }
                      : { background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }
                  }>
                  {/* auto-running shimmer sweep */}
                  <motion.span className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)", width: "60%" }}
                    animate={{ x: ["-80%", "220%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }} />
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #c2410c 100%)" }} />
                  <WinIcon className="w-5 h-5 relative flex-shrink-0" />
                  <span className="relative text-left leading-tight">
                    <span className="block text-[9px] font-medium opacity-70 mb-0.5 uppercase tracking-wider">Download for</span>
                    <span className="block text-[15px] font-black">Windows</span>
                  </span>
                  <span className="relative ml-auto flex items-center gap-1">
                    <span className="text-[9px] font-black bg-white/22 px-2 py-0.5 rounded-full">FREE</span>
                    <svg className="w-3.5 h-3.5 opacity-70 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                )}

                {/* macOS button — primary when on Mac, secondary when on Windows */}
                {(!mounted || detectedOS !== "win") && (
                <button onClick={() => onDownload("mac")}
                  className="group relative flex items-center gap-3 px-6 py-4 rounded-xl text-white font-bold overflow-hidden transition-all active:scale-[0.97] sm:flex-none"
                  style={
                    mounted && detectedOS === "mac"
                      ? { background: "linear-gradient(135deg, #18181b 0%, #3f3f46 100%)", boxShadow: "0 8px 28px rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.10)" }
                      : { background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }
                  }>
                  {mounted && detectedOS === "mac" && (
                    <motion.span className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)", width: "60%" }}
                      animate={{ x: ["-80%", "220%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }} />
                  )}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #27272a, #3f3f46)" }} />
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
                  <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[11px] text-gray-500">Free forever</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[11px] text-gray-500">No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[11px] text-gray-500">Zero audio stored</span>
                </div>
                <div className="w-px h-3 bg-gray-200" />
                <button onClick={() => onNav("real-interview")}
                  className="text-[12px] font-semibold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1 group">
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
                { value: "50K+",  label: "Sessions" },
                { value: "1.8s",  label: "Response time" },
                { value: "87%",   label: "Offer rate" },
                { value: "4.9★",  label: "Rating" },
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

            {/* Social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {["AM","PS","RK","SI","AN"].map((ini, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${["from-violet-500 to-purple-600","from-orange-400 to-orange-600","from-purple-500 to-violet-700","from-amber-500 to-orange-600","from-violet-400 to-orange-500"][i]}`}>{ini}</div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                <span className="text-gray-700 font-semibold">50,000+ professionals</span> · Google · Amazon · Microsoft
              </p>
            </motion.div>
          </div>

          {/* ── RIGHT: Product mockup ── */}
          <motion.div style={{ y: mockY }}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block">

            {/* Glow behind window */}
            <div className="absolute inset-x-12 top-6 bottom-6 pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.16) 0%, transparent 70%)", filter: "blur(24px)" }} />

            <div className="relative rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(124,58,237,0.14)", boxShadow: "0 24px 80px rgba(109,40,217,0.12), 0 6px 20px rgba(0,0,0,0.06)" }}>

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
                    style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)" }}>CX</div>
                  <span className="text-[12px] font-semibold text-gray-700">Verchor</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-[11px] text-gray-400">Interview Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-mono">12:47</span>
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-600 font-bold tracking-wider">LIVE</span>
                  </div>
                </div>
              </div>

              {/* App body */}
              <div className="p-5 space-y-4" style={{ background: "linear-gradient(160deg, #fdfcff 0%, #fffaf6 100%)" }}>

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
                    style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", boxShadow: "0 0 12px rgba(109,40,217,0.28)" }}>AI</div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.055) 0%, rgba(234,88,12,0.035) 100%)", border: "1px solid rgba(109,40,217,0.16)" }}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-violet-100/60">
                      <div className="flex items-end gap-[2.5px] h-4">
                        {[9,15,7,13,10,16,8,12].map((h, i) => (
                          <motion.div key={i}
                            animate={{ height: [4, h, 4] }}
                            transition={{ duration: 1.2 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                            style={{ width: "2px", borderRadius: "2px", background: "linear-gradient(to top, #6d28d9, #ea580c)" }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        Verchor · 1.8s
                      </span>
                      <div className="ml-auto flex items-center gap-1 bg-orange-50 rounded-md px-2 py-0.5 border border-orange-100">
                        <svg className="w-2.5 h-2.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <span className="text-[9px] text-orange-600 font-semibold tracking-wide">STEALTH</span>
                      </div>
                    </div>
                    <p className="px-4 py-3.5 text-sm text-gray-700 leading-relaxed">
                      "In my previous role I led a 5-person cross-functional team delivering a critical API migration in 3 weeks, on time, with a{" "}
                      <span className="font-semibold text-violet-700">40% latency reduction</span>."
                    </p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="px-1 pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Response Confidence</span>
                    <span className="text-[10px] font-black" style={{ background: "linear-gradient(135deg, #6d28d9, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>98%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "98%" }}
                      transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #6d28d9, #ea580c)" }}
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
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px solid rgba(124,58,237,0.12)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.12), rgba(124,58,237,0.10))" }}>
                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px solid rgba(124,58,237,0.12)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(109,40,217,0.08))" }}>
                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-800">1.8s Response</div>
                <div className="text-[9px] text-gray-400">Real-time answer</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
