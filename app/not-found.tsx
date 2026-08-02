// Custom 404 page. Shown for any unmatched route instead of a bare default.

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#050508] px-6">
      <div className="text-center max-w-md">
        <p className="text-[80px] leading-none font-black mb-2"
          style={{ background: "linear-gradient(135deg,#a78bfa,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          404
        </p>
        <h1 className="text-white font-black text-2xl mb-2 tracking-tight">Page not found</h1>
        <p className="text-gray-400 text-sm mb-7 leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-all">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
