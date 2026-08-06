"use client";

// Route-level error boundary. Next.js renders this instead of crashing to a
// blank screen when a client/server component in the page tree throws. It keeps
// the user in control (retry or go home) rather than showing a dead white page.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it for debugging without exposing internals to the user.
    console.error("[Verchor] Unhandled UI error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#050508] px-6">
      <div className="text-center max-w-md w-full p-8 bg-[#0d0d14] rounded-3xl border border-gray-800">
        <div className="w-16 h-16 bg-zinc-800/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-white font-black text-2xl mb-2 tracking-tight">Something went wrong</h1>
        <p className="text-gray-400 text-sm mb-7 leading-relaxed">
          We hit an unexpected error. Your data is safe. Try again, or head back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all">
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-200 font-semibold px-6 py-3 rounded-xl border border-gray-700 transition-all">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
