"use client";

import Link from "next/link";
import BrandIcon from "./BrandIcon";

const GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Mock interview", href: "/mock-interview" },
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
      { label: "Download for Windows", href: "/app.msixbundle" },
      { label: "Download for macOS", href: "https://github.com/moto123a/interview-copilot-mac/releases/latest/download/InterviewCopilot-mac.dmg" },
    ],
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
              {["100 free monthly credits", "Clear plan limits", "Secure Stripe checkout"].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{item}</span>
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
                      <Link href={link.href} className="text-sm text-white/60 transition hover:text-emerald-300">{link.label}</Link>
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
