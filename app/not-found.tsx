// Custom 404 page. Shown for any unmatched route instead of a bare default.

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FDFCFA] px-6 py-16">
      <div className="text-center max-w-md">
        <p
          className="text-[80px] leading-none font-black mb-2"
          style={{
            background: "linear-gradient(135deg,#1C7A3E,#2E8B45)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          aria-hidden="true"
        >
          404
        </p>
        <h1 className="text-[#16150F] font-black text-2xl mb-2 tracking-tight">Page not found</h1>
        <p className="text-[#4A4A41] text-sm mb-7 leading-relaxed">
          We could not find that page. It may have moved or no longer exists.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-colors bg-[#1C7A3E] hover:bg-[#14532B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C7A3E]">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
