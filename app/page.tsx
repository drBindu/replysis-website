"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import CreditsBadge from "../components/CreditsBadge";
import AuthModal from "../components/AuthModal";
import BrandIcon from "../components/BrandIcon";

import HeroSection from "../components/home/HeroSection";
import DownloadSection from "../components/home/DownloadSection";
import WhatIsItSection from "../components/home/WhatIsItSection";
import DemoSection from "../components/home/DemoSection";
import FeaturesSection from "../components/home/FeaturesSection";
import EnterpriseSection from "../components/home/EnterpriseSection";
import WhyUsSection from "../components/home/WhyUsSection";
import {
  TrustedBySection, StatsSection,
  HowItWorksSection, CtaSection,
} from "../components/home/MidSections";

const WINDOWS_DOWNLOAD = "/app.msixbundle";
const MAC_DOWNLOAD     = "https://github.com/moto123a/interview-copilot-mac/releases/latest/download/InterviewCopilot-mac.dmg";

/**
 * Reading the query string opts a component out of static rendering, so it is
 * isolated here behind its own Suspense boundary. Keeping it in the page body
 * would have forced the entire marketing homepage to render on the client and
 * ship empty HTML. Renders nothing.
 */
function AuthQueryWatcher({ onAuthRequired }: { onAuthRequired: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("auth") === "required") onAuthRequired();
  }, [searchParams, onAuthRequired]);

  return null;
}

export default function Home() {
  const router       = useRouter();
  const [user, setUser]               = useState<any>(null);
  const [showMenu, setShowMenu]       = useState(false);   // profile dropdown
  const [showMobile, setShowMobile]   = useState(false);   // mobile nav drawer
  const [authModal, setAuthModal]     = useState<{ open: boolean; mode: "signin" | "signup" }>({ open: false, mode: "signin" });
  const [mounted, setMounted]         = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [detectedOS, setDetectedOS]   = useState<"win" | "mac" | "other">("other");
  const menuRef   = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress, scrollY } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.05], ["rgba(255,255,255,0.70)", "rgba(255,255,255,0.96)"]);

  useEffect(() => {
    const ua = navigator.userAgent;
    // Phones/tablets can't run the desktop app and iOS reports "Mac OS X",
    // so exclude them first → "other" (shows both, no misleading .dmg).
    if (/iPhone|iPad|iPod|Android/i.test(ua)) setDetectedOS("other");
    else if (/Windows/i.test(ua)) setDetectedOS("win");
    else if (/Mac/i.test(ua))     setDetectedOS("mac");
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  useEffect(() => { const u = onAuthStateChanged(auth, setUser); return () => u(); }, []);

  const openRequiredAuth = useCallback(() => {
    setAuthModal((current) =>
      current.open && current.mode === "signin"
        ? current
        : { open: true, mode: "signin" }
    );
  }, []);

  // The ?auth=required redirect is handled by <AuthQueryWatcher/> below, which
  // keeps the query-string read inside its own Suspense boundary.

  // Close profile dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  // Close mobile drawer on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setShowMobile(false);
    };
    if (showMobile) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMobile]);

  useEffect(() => {
    if (!document.querySelector('link[href*="Inter"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const go = (path: string) => {
    // Only pricing is public  -  everything else requires sign-in
    if (!user && path !== "pricing") {
      setAuthModal({ open: true, mode: "signin" }); return;
    }
    router.push("/" + path);
  };

  const handleLogout = async () => {
    await signOut(auth);
    await fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" });
    setUser(null); setShowMenu(false);
  };

  const download = async (os: "win" | "mac") => {
    const a = document.createElement("a");
    a.href     = os === "win" ? WINDOWS_DOWNLOAD : MAC_DOWNLOAD;
    a.download = os === "win" ? "app.msixbundle" : "InterviewCopilot-mac.dmg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    try {
      const authToken = (await auth.currentUser?.getIdToken()) ?? "";
      await fetch("/api/telemetry/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ os }),
        keepalive: true,
      });
    } catch { /* Download telemetry must never affect the download itself. */ }
  };

  return (
    <main className="marketing bg-[#FDFCFA] text-[#16150F] overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <Suspense fallback={null}>
        <AuthQueryWatcher onAuthRequired={openRequiredAuth} />
      </Suspense>

      {/* Premium film-grain texture over the whole page */}
      <div className="grain-overlay" aria-hidden />

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[100] h-[3px]"
        style={{ scaleX: scrollYProgress, transformOrigin: "0%", background: "linear-gradient(90deg, #21924A, #21924A)" }}
      />

      {/* ══════════════ NAVBAR ══════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50">

        {/* Announcement banner — slim top bar, retracts on scroll */}
        <motion.div
          animate={{ height: (!user && !scrolled) ? "auto" : 0, opacity: (!user && !scrolled) ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden">
          {!user && (
          <div className="w-full text-center py-2 text-[11px] font-semibold hidden md:flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(90deg, rgba(31,138,62,0.08), rgba(31,138,62,0.05))", borderBottom: "1px solid rgba(31,138,62,0.08)", backdropFilter: "blur(12px)" }}>
            <span className="text-[9px] font-black text-white bg-[#21924A] px-1.5 py-0.5 rounded-full uppercase tracking-widest">NEW</span>
            <span className="text-gray-600">Screen analysis + multi-platform audio capture now live.</span>
            <button onClick={() => go("real-interview")} className="text-[#1C7A3E] font-bold hover:text-[#14532B] transition-colors underline underline-offset-2">Try it free →</button>
          </div>
          )}
        </motion.div>

        {/* Floating pill nav — shrinks + lifts on scroll */}
        <motion.div
          animate={{
            maxWidth: scrolled ? 940 : 1280,
            marginTop: scrolled ? 12 : 0,
            borderRadius: scrolled ? 999 : 0,
            paddingLeft: scrolled ? 14 : 20,
            paddingRight: scrolled ? 8 : 20,
          }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            backgroundColor: scrolled ? "rgba(253,252,250,0.80)" : "rgba(253,252,250,0.55)",
            border: scrolled ? "1px solid rgba(22,21,15,0.07)" : "1px solid rgba(31,138,62,0.06)",
            boxShadow: scrolled ? "0 14px 44px -12px rgba(22,21,15,0.22), 0 4px 12px -8px rgba(22,21,15,0.14)" : "0 1px 0 rgba(22,21,15,0.02)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          className="mx-auto h-16 flex items-center gap-3">

          {/* ── Logo ── */}
          <button onClick={() => router.push("/")}
            className="flex items-center gap-2 flex-shrink-0 group">
            <BrandIcon size={32}
              className="group-hover:scale-105 transition-transform duration-200 drop-shadow-[0_4px_10px_rgba(33,146,74,0.18)]" />
            <span className="text-[15px] font-extrabold tracking-tight text-gray-900">
              Replysis{" "}
              <span style={{ color: "#1C7A3E" }}>AI</span>
            </span>
          </button>

          {/* ── Divider ── */}
          <div className="hidden lg:block w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

          {/* ── Nav links  -  desktop (lg+) ── */}
          <nav className="hidden lg:flex items-center gap-0 flex-1">
            {[
              { label: "Features",       path: "features",       direct: true },
              { label: "Resume",         path: "resume",         direct: false },
              { label: "Mock Interview", path: "mock-interview", direct: false },
              { label: "Real-Time AI",   path: "real-interview", direct: false },
              { label: "Pricing",        path: "pricing",        direct: true },
            ].map(item => (
              <button key={item.path}
                onClick={() => item.direct ? router.push("/" + item.path) : go(item.path)}
                className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-zinc-900 hover:bg-zinc-100/70 rounded-lg transition-all duration-150 whitespace-nowrap">
                {item.label}
              </button>
            ))}
          </nav>

          {/* Spacer (md, no nav links) */}
          <div className="flex-1 lg:hidden" />

          {/* ── Download pills  -  md+ ── */}
          <div className="hidden md:flex items-center gap-2 mr-1">
            {(!mounted || detectedOS !== "mac") && (
            <button onClick={() => download("win")}
              className="group relative flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold text-white rounded-full transition-all active:scale-[0.97] whitespace-nowrap overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)", boxShadow: "0 2px 10px rgba(26,102,48,0.28)" }}>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)" }} />
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
              </svg>
              Windows
              <svg className="w-2.5 h-2.5 group-hover:translate-y-0.5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            )}
            {(!mounted || detectedOS !== "win") && (
            <button onClick={() => download("mac")}
              className="group flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold text-gray-700 bg-white border border-gray-200 hover:border-zinc-400 hover:text-zinc-900 rounded-full transition-all active:scale-[0.97] shadow-sm whitespace-nowrap">
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              macOS
              <svg className="w-2.5 h-2.5 group-hover:translate-y-0.5 transition-transform flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            )}
          </div>

          {/* ── Thin separator ── */}
          <div className="hidden md:block w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* ── Auth cluster  -  always visible ── */}
          <div className="flex items-center gap-2">
            <CreditsBadge />

            {!user ? (
              <>
                {/* Log in  -  clearly outlined so it reads as "secondary" */}
                <button onClick={() => setAuthModal({ open: true, mode: "signin" })}
                  className="px-4 py-1.5 text-[13px] font-semibold text-gray-600 hover:text-zinc-900 border border-gray-200 hover:border-zinc-400 rounded-full transition-all whitespace-nowrap bg-white hover:bg-zinc-100/60 shadow-sm">
                  Log in
                </button>

                {/* Get started  -  unmissable primary CTA */}
                <button onClick={() => setAuthModal({ open: true, mode: "signup" })}
                  className="group flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold text-white rounded-full transition-all active:scale-[0.97] whitespace-nowrap relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)", boxShadow: "0 3px 12px rgba(26,102,48,0.38), 0 1px 3px rgba(31,138,62,0.20)" }}>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} />
                  <span className="relative hidden sm:inline">Start free</span>
                  <span className="relative sm:hidden">Sign up</span>
                  <svg className="relative w-3 h-3 group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            ) : (
              /* Logged-in: avatar + dropdown */
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(v => !v)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-100 transition-all group focus:outline-none">
                  <img
                    src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    alt="Profile"
                    className="w-7 h-7 rounded-full border-2 border-zinc-300 group-hover:border-zinc-600 transition-colors shadow-sm"
                  />
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${showMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMenu && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 rounded-2xl shadow-xl overflow-hidden bg-white"
                    style={{ border: "1px solid rgba(31,138,62,0.10)", boxShadow: "0 16px 48px rgba(0,0,0,0.10), 0 4px 12px rgba(31,138,62,0.08)" }}>
                    {/* User info */}
                    <div className="px-4 py-3.5 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                          alt="Profile"
                          className="w-9 h-9 rounded-full border border-zinc-200"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{user.displayName || "User"}</p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div className="p-1.5">
                      {[
                        { label: "Real-Time AI",   path: "real-interview", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                        { label: "Mock Interview",  path: "mock-interview", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" },
                        { label: "Resume Builder",  path: "resume",        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                        { label: "Pricing",         path: "pricing",       icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
                      ].map(item => (
                        <button key={item.path} onClick={() => { go(item.path); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {/* Sign out */}
                    <div className="p-1.5 border-t border-gray-100">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Hamburger  -  < lg only ── */}
            <button onClick={() => setShowMobile(v => !v)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all">
              {showMobile ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        {/* ══ Mobile drawer  -  slides down from nav ══ */}
        {showMobile && (
          <motion.div ref={mobileRef}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="lg:hidden border-t border-gray-100 bg-white/98 backdrop-blur-xl">

            {/* Nav links */}
            <div className="px-4 pt-3 pb-2 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Features</p>
              {[
                { label: "Features",        path: "features",       direct: true,  icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
                { label: "Resume Builder",  path: "resume",         direct: false, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                { label: "Mock Interview",  path: "mock-interview", direct: false, icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" },
                { label: "Real-Time AI",    path: "real-interview", direct: false, icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                { label: "Pricing",         path: "pricing",        direct: true,  icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
              ].map(item => (
                <button key={item.path}
                  onClick={() => { item.direct ? router.push("/" + item.path) : go(item.path); setShowMobile(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-semibold text-gray-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Download  -  only on < md (md+ already shows pills in navbar) */}
            <div className="px-4 pb-3 md:hidden">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Download App</p>
              <div className={`grid gap-2 ${mounted && detectedOS !== "other" ? "grid-cols-1" : "grid-cols-2"}`}>
                {(!mounted || detectedOS !== "mac") && (
                <button onClick={() => { download("win"); setShowMobile(false); }}
                  className="flex items-center justify-center gap-2 py-3 text-[12px] font-bold text-white rounded-xl"
                  style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                  </svg>
                  Windows
                </button>
                )}
                {(!mounted || detectedOS !== "win") && (
                <button onClick={() => { download("mac"); setShowMobile(false); }}
                  className="flex items-center justify-center gap-2 py-3 text-[12px] font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                  macOS
                </button>
                )}
              </div>
            </div>

            {/* Auth row */}
            {!user && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex gap-2">
                <button onClick={() => { setAuthModal({ open: true, mode: "signin" }); setShowMobile(false); }}
                  className="flex-1 py-2.5 text-[13px] font-semibold text-gray-700 border border-gray-200 hover:border-zinc-400 hover:text-zinc-900 rounded-xl transition-all">
                  Log in
                </button>
                <button onClick={() => { setAuthModal({ open: true, mode: "signup" }); setShowMobile(false); }}
                  className="flex-1 py-2.5 text-[13px] font-bold text-white rounded-xl transition-all"
                  style={{ background: "linear-gradient(135deg, #1C7A3E, #21924A)" }}>
                  Get started free
                </button>
              </div>
            )}
          </motion.div>
        )}
      </header>

      <HeroSection mounted={mounted} detectedOS={detectedOS} onDownload={download} onNav={go} />
      <TrustedBySection />
      <StatsSection />
      <EnterpriseSection />
      <WhatIsItSection onNav={go} />
      <DemoSection onNav={go} />
      <HowItWorksSection />
      <FeaturesSection />
      <WhyUsSection />
      <DownloadSection mounted={mounted} detectedOS={detectedOS} onDownload={download} />
      <CtaSection onNav={go} />

      {/* ── Auth modal  -  opens on Log in / Get started, never leaves the page ── */}
      <AuthModal
        open={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal(v => ({ ...v, open: false }))}
        onSuccess={() => setAuthModal(v => ({ ...v, open: false }))}
      />
    </main>
  );
}
