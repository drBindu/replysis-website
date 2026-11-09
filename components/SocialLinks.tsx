"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type MouseEvent } from "react";

// Official Replysis pages, shown in the footer only.
// Keep in step with SOCIAL_PROFILES in app/layout.tsx (that list tells Google these pages are ours).
export const SOCIAL = [
  {
    label: "Instagram",
    handle: "@replysis_ai",
    viewBox: "0 0 24 24",
    sparks: ["#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5"],
    href: "https://www.instagram.com/replysis_ai/",
    icon: "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1 0-1.6.2-1.9.3-.5.2-.8.4-1.2.8-.4.4-.6.7-.8 1.2-.1.4-.3.9-.3 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c0 1 .2 1.6.3 1.9.2.5.4.8.8 1.2.4.4.7.6 1.2.8.4.1.9.3 1.9.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1 0 1.6-.2 1.9-.3.5-.2.8-.4 1.2-.8.4-.4.6-.7.8-1.2.1-.4.3-.9.3-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1-.2-1.6-.3-1.9-.2-.5-.4-.8-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.1-.9-.3-1.9-.3-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.2-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z",
  },
  {
    label: "Facebook",
    handle: "Replysis",
    viewBox: "2 2 20 20",   // the disc fills the whole button
    sparks: ["#1877F2", "#6cb2ff", "#ffffff", "#1877F2"],
    href: "https://www.facebook.com/profile.php?id=61594662147470",
    icon: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
  },
];

type Props = { className?: string; style?: CSSProperties };

const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The real Instagram and Facebook logos as small buttons (styles: .social-* in app/globals.css).
// They pop in when the footer comes into view, lean toward the pointer, and throw brand colour sparks on click.
export default function SocialLinks({ className = "", style }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (still() || !("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const lean = (e: PointerEvent<HTMLAnchorElement>) => {
    if (still() || e.pointerType !== "mouse") return;
    const a = e.currentTarget, r = a.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    a.style.setProperty("--mx", `${(x * 6).toFixed(1)}px`);
    a.style.setProperty("--my", `${(y * 6).toFixed(1)}px`);
    a.style.setProperty("--rx", `${(-y * 18).toFixed(1)}deg`);
    a.style.setProperty("--ry", `${(x * 18).toFixed(1)}deg`);
  };
  const settle = (e: PointerEvent<HTMLAnchorElement>) => {
    for (const k of ["--mx", "--my", "--rx", "--ry"]) e.currentTarget.style.removeProperty(k);
  };
  const burst = (e: MouseEvent<HTMLAnchorElement>, colors: string[]) => {
    if (still()) return;
    const host = e.currentTarget.parentElement;
    if (!host) return;
    for (let i = 0; i < 12; i++) {
      const d = document.createElement("span");
      const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.4, dist = 22 + Math.random() * 16;
      d.className = "social-spark";
      d.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
      d.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
      d.style.background = colors[i % colors.length];
      host.appendChild(d);
      setTimeout(() => d.remove(), 700);
    }
  };

  return (
    <div ref={box} className={className} style={style}>
      <div className="flex items-center gap-3.5">
        {SOCIAL.map((s, i) => (
          <span key={s.label} className={`social-wrap ${shown ? "social-in" : ""}`} style={{ animationDelay: `${i * 0.12}s` }}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={`Follow Replysis on ${s.label}`}
              onPointerMove={lean}
              onPointerLeave={settle}
              onClick={(e) => burst(e, s.sparks)}
              className={`social-btn ${s.label === "Instagram" ? "social-ig" : "social-fb"} flex items-center justify-center`}
            >
              <span className="social-face" aria-hidden="true" />
              <span className="social-ring" aria-hidden="true" />
              <span className="social-ripple" aria-hidden="true" />
              <svg className="social-glyph" viewBox={s.viewBox} fill="currentColor" aria-hidden="true"><path d={s.icon} /></svg>
            </a>
            <span className="social-tip" aria-hidden="true">{s.label} {s.handle}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
