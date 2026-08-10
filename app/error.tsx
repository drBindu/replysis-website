"use client";

// Route-level error boundary. Next.js renders this instead of crashing to a
// blank screen when a client/server component in the page tree throws. It keeps
// the user in control (retry or go home) rather than showing a dead white page.
//
// The technical error is logged to the console for developers; the user only
// ever sees a calm, plain-language message with one clear next action.

import { useEffect, useRef } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Surface it for debugging without exposing internals to the user.
    console.error("[Replysis] Unhandled UI error:", error);
  }, [error]);

  useEffect(() => {
    // Move focus to the message so screen-reader and keyboard users land on it.
    headingRef.current?.focus();
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FDFCFA] px-6 py-16">
      <div
        role="alert"
        className="text-center max-w-md w-full p-8 bg-white rounded-2xl border border-[#E9E7E0]"
        style={{ boxShadow: "0 6px 20px rgba(22,21,15,0.07), 0 2px 6px rgba(22,21,15,0.05)" }}
      >
        <div className="w-14 h-14 bg-[#EEF7EF] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-[#1C7A3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[#16150F] font-black text-2xl mb-2 tracking-tight outline-none"
        >
          This page could not load
        </h1>
        <p className="text-[#4A4A41] text-sm mb-7 leading-relaxed">
          Something interrupted this page while it was loading. Your account and saved work are safe.
          Try again, or head back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-colors bg-[#1C7A3E] hover:bg-[#14532B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C7A3E]">
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F7F6F1] text-[#16150F] font-semibold px-6 py-3 rounded-xl border border-[#E9E7E0] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C7A3E]">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
