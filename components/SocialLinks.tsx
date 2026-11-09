import type { CSSProperties } from "react";

// Official Replysis pages, shown in the footer only.
// Keep in step with SOCIAL_PROFILES in app/layout.tsx (that list tells Google these pages are ours).
export const SOCIAL = [
  {
    label: "Instagram",
    handle: "@replysis_ai",
    cta: "Follow @replysis_ai",
    href: "https://www.instagram.com/replysis_ai/",
    icon: "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1 0-1.6.2-1.9.3-.5.2-.8.4-1.2.8-.4.4-.6.7-.8 1.2-.1.4-.3.9-.3 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c0 1 .2 1.6.3 1.9.2.5.4.8.8 1.2.4.4.7.6 1.2.8.4.1.9.3 1.9.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1 0 1.6-.2 1.9-.3.5-.2.8-.4 1.2-.8.4-.4.6-.7.8-1.2.1-.4.3-.9.3-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1-.2-1.6-.3-1.9-.2-.5-.4-.8-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.1-.9-.3-1.9-.3-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.2-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z",
  },
  {
    label: "Facebook",
    handle: "Replysis",
    cta: "Follow on Facebook",
    href: "https://www.facebook.com/profile.php?id=61594662147470",
    icon: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
  },
];

type Props = { className?: string; tone?: "dark" | "light"; style?: CSSProperties };

// "Follow" buttons with the handle written out, so people know what they will find before they tap.
export default function SocialLinks({ className = "", tone = "dark", style }: Props) {
  const dark = tone === "dark";
  return (
    <div className={className} style={style}>
      <p className={`text-sm font-semibold ${dark ? "text-white/70" : "text-stone-700"}`}>
        Follow Replysis for interview tips, real answers and new features
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {SOCIAL.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={`Follow Replysis on ${s.label}`}
            className={`social-btn ${s.label === "Instagram" ? "social-ig" : "social-fb"} inline-flex items-center gap-2.5 rounded-full py-2.5 pl-3.5 pr-5 text-sm font-bold`}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d={s.icon} /></svg>
            <span>{s.cta}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
