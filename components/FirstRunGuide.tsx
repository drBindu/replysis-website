"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileText, MessageCircleQuestion, Mic2, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

const STEPS = [
  { title: "Prepare your resume", body: "Give Replysis the context it needs.", href: "/resume", icon: FileText },
  { title: "Practice a mock interview", body: "Build confidence before the real call.", href: "/mock-interview", icon: MessageCircleQuestion },
  { title: "Set up the live copilot", body: "Choose your role and start when ready.", href: "/real-interview", icon: Mic2 },
] as const;

export default function FirstRunGuide() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setOpen(false);
    if (!user || pathname === "/pricing" || pathname === "/account" || pathname.startsWith("/admin")) return;
    const localKey = `replysis-onboarding-seen:${user.uid}`;
    if (localStorage.getItem(localKey)) return;

    const timer = setTimeout(() => setOpen(true), 700);
    return () => {
      clearTimeout(timer);
    };
  }, [pathname, user]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function markSeen() {
    if (!user) return;
    localStorage.setItem(`replysis-onboarding-seen:${user.uid}`, "1");
  }

  function dismiss() {
    setOpen(false);
    markSeen();
  }

  function choose(href: string) {
    setOpen(false);
    markSeen();
    router.push(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="first-run-title"
            aria-describedby="first-run-description"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/70 bg-[#fbfcf9] shadow-[0_35px_100px_rgba(15,23,42,0.35)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-[#176533] via-[#3b9b59] to-[#74bf80]" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={dismiss}
              aria-label="Close getting started guide"
              className="absolute right-4 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#1C7A3E]">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#267b42]">Welcome to Replysis</p>
              <h2 id="first-run-title" className="mt-2 pr-10 text-2xl font-black tracking-tight sm:text-3xl">What would you like to do first?</h2>
              <p id="first-run-description" className="mt-2 text-sm leading-6 text-slate-600">There is no complicated setup. Pick one step now; you can use the others anytime.</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.href}
                      type="button"
                      onClick={() => choose(step.href)}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Step {index + 1}</span>
                        <Icon className="h-5 w-5 text-[#267b42]" />
                      </div>
                      <h3 className="mt-4 text-sm font-black text-slate-900">{step.title}</h3>
                      <p className="mt-1.5 min-h-10 text-xs leading-5 text-slate-500">{step.body}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#267b42]">Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">Your Starter plan includes 100 monthly credits. No payment details required.</p>
                <button type="button" onClick={dismiss} className="whitespace-nowrap rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">I will explore myself</button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
