"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeUp } from "./shared";
import { OSDownloadButtons } from "./HeroSection";

interface Props {
  mounted: boolean;
  detectedOS: "win" | "mac" | "other";
  onDownload: (os: "win" | "mac") => void;
}

function WinIcon({ className = "" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>;
}
function MacIcon({ className = "" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>;
}

export default function DownloadSection({ mounted, detectedOS, onDownload }: Props) {
  const badgesRef = useRef(null);
  const badgesInView = useInView(badgesRef, { once: true, margin: "-40px" });

  const heading =
    mounted && detectedOS === "win" ? "Made for Windows. Ready now." :
    mounted && detectedOS === "mac" ? "Made for Mac. Ready now." :
    "Native controls for live interviews.";

  return (
    <section id="download-section" className="py-28 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <FadeUp className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-gray-500 bg-white border border-gray-200 mb-4 uppercase tracking-widest">Desktop App</span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">{heading}</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            The native app provides operating-system capture controls for standard screen-share paths. Test your exact setup before an interview.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="relative rounded-3xl overflow-hidden bg-white border-2 border-gray-100 shadow-xl p-12 text-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 via-zinc-800 to-zinc-800" />

            {/* OS-specific hero block */}
            {mounted && detectedOS === "win" && (
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900 shadow-2xl mb-5">
                  <WinIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Replysis for Windows</h3>
                <p className="text-gray-500 mb-7">MSIX installer · Works on Windows 10 and 11 · Auto-updates</p>
                <button onClick={() => onDownload("win")}
                  className="inline-flex items-center gap-3 px-10 py-5 bg-zinc-900 hover:bg-zinc-900 text-white font-black text-lg rounded-2xl shadow-[0_8px_40px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_48px_rgba(37,99,235,0.55)] transition-all active:scale-[0.97]">
                  <WinIcon className="w-6 h-6" /> Download for Windows, Free
                </button>
              </div>
            )}

            {mounted && detectedOS === "mac" && (
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gray-900 shadow-2xl mb-5">
                  <MacIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Replysis for macOS</h3>
                <p className="text-gray-500 mb-7">.dmg · macOS 12 and above · Apple Silicon</p>
                <button onClick={() => onDownload("mac")}
                  className="inline-flex items-center gap-3 px-10 py-5 bg-gray-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.45)] transition-all active:scale-[0.97]">
                  <MacIcon className="w-6 h-6" /> Download for macOS, Free
                </button>
              </div>
            )}

            {(!mounted || detectedOS === "other") && (
              <div className="mb-8">
                <OSDownloadButtons detectedOS={detectedOS} mounted={mounted} onDownload={onDownload} size="large" />
              </div>
            )}

            <div ref={badgesRef} className="flex flex-wrap justify-center gap-5 text-[12px] border-t border-gray-100 pt-6">
              {["Free to start", "No credit card", "Raw audio not stored", "Desktop capture controls", "Auto-updates"].map((t, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={badgesInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.09, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1.5 text-gray-500">
                  <span className="text-zinc-800 font-bold">✓</span> {t}
                </motion.span>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
