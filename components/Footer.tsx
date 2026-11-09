"use client";

import Link from "next/link";
import BrandIcon from "./BrandIcon";
import { TRIAL_DAYS } from "../data/productFacts";

const GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Mock interview", href: "/mock-interview" },
      { label: "Question bank", href: "/question-bank" },
      { label: "How to answer", href: "/interview-questions" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Trust Center", href: "/trust" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact support", href: "mailto:support@replysis.com" },
      { label: "Get it on the Microsoft Store", href: "https://apps.microsoft.com/detail/9N13GQC3MKK9" },
      { label: "Download for macOS", href: "https://github.com/drBindu/replysis-mac/releases/latest/download/InterviewCopilot-mac.dmg" },
    ],
  },
];

// Official Replysis pages. Keep in step with SOCIAL_PROFILES in app/layout.tsx (tells Google these pages are ours).
const SOCIAL = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/replysis_ai/",
    icon: "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1 0-1.6.2-1.9.3-.5.2-.8.4-1.2.8-.4.4-.6.7-.8 1.2-.1.4-.3.9-.3 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c0 1 .2 1.6.3 1.9.2.5.4.8.8 1.2.4.4.7.6 1.2.8.4.1.9.3 1.9.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1 0 1.6-.2 1.9-.3.5-.2.8-.4 1.2-.8.4-.4.6-.7.8-1.2.1-.4.3-.9.3-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1-.2-1.6-.3-1.9-.2-.5-.4-.8-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.1-.9-.3-1.9-.3-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.2-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61594662147470",
    icon: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[#0c120e] text-white">
      <div className="pointer-events-none absolute -left-40 -top-52 h-[420px] w-[420px] rounded-full bg-emerald-400/[0.07] blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Replysis home">
              <BrandIcon size={38} className="drop-shadow-[0_8px_24px_rgba(52,224,138,0.18)]" />
              <span className="text-base font-black tracking-tight">Replysis <span className="text-emerald-400">AI</span></span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/50">
              A connected interview workspace for resume preparation, realistic practice, and fast live guidance grounded in the context you provide.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-white/55">
              {[`${TRIAL_DAYS} day free trial`, "Cancel anytime", "Secure Stripe checkout"].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{item}</span>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={`Replysis on ${s.label}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-emerald-300/40 hover:text-emerald-300"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={s.icon} /></svg>
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{group.title}</h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="inline-block py-1.5 text-sm text-white/60 transition hover:text-emerald-300 sm:py-0">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Replysis. All rights reserved.</p>
          <p>AI suggestions can be inaccurate. Verify facts and follow interview-platform rules.</p>
        </div>
      </div>
    </footer>
  );
}
