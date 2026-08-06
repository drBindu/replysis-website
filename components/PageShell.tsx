import Link from "next/link";
import BrandIcon from "./BrandIcon";

const NAV = [
  { label: "Features",     href: "/features" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "Pricing",      href: "/pricing" },
  { label: "Mock Interview", href: "/mock-interview" },
];

export function PageHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100/80"
      style={{ boxShadow: "0 1px 0 rgba(31,138,62,0.06)" }}>
      <div className="max-w-6xl mx-auto px-6 py-0 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="Verchor home">
          <BrandIcon size={32} className="drop-shadow-[0_4px_10px_rgba(33,146,74,0.18)]" />
          <span className="text-[15px] font-black text-gray-900 tracking-tight">
            Verchor{" "}
            <span style={{ background: "linear-gradient(135deg,#21924A,#21924A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              AI
            </span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className="px-3.5 py-2 text-[13px] font-semibold text-gray-500 hover:text-zinc-900 hover:bg-zinc-100/70 rounded-lg transition-all duration-150 whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link href="/"
            className="text-[13px] font-semibold text-gray-500 hover:text-gray-700 transition-colors hidden sm:block">
            ← Home
          </Link>
          <Link href="/real-interview"
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold text-white rounded-full whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#1C7A3E,#21924A)", boxShadow: "0 3px 12px rgba(26,102,48,0.32)" }}>
            Try free
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PageFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <span>&copy; {new Date().getFullYear()} Verchor. All rights reserved.</span>
        <div className="flex items-center gap-5">
          {[
            { label: "Features",    href: "/features" },
            { label: "Pricing",     href: "/pricing" },
            { label: "Privacy",     href: "/privacy" },
            { label: "Terms",       href: "/terms" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="hover:text-zinc-900 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
