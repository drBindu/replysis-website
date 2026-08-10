"use client";

// Inline failure state for a region of a page that could not load: a list, a
// panel, a chart. Use this instead of leaving a spinner running forever or
// collapsing the section to nothing.
//
// The retry button re-runs the caller's own operation. It is deliberately a
// required prop when a retry is offered, so a button that does nothing cannot
// ship by accident.

import { copyFor, type FailureKind } from "./messages";

type InlineErrorProps = {
  kind?: FailureKind;
  /** Overrides the house copy when a screen needs something more specific. */
  title?: string;
  body?: string;
  /** Wire this to the exact call that failed. */
  onRetry?: () => void;
  className?: string;
};

export default function InlineError({
  kind = "unknown",
  title,
  body,
  onRetry,
  className = "",
}: InlineErrorProps) {
  const copy = copyFor(kind);
  const heading = title ?? copy.title;
  const description = body ?? copy.body;
  const actionLabel = copy.action ?? "Try again";

  return (
    <div
      role="alert"
      className={`rounded-xl border border-[#E9E7E0] bg-white px-5 py-6 text-center ${className}`}
    >
      <p className="text-[14px] font-bold text-[#16150F] mb-1">{heading}</p>
      <p className="text-[13px] text-[#4A4A41] leading-relaxed max-w-sm mx-auto">{description}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[#1C7A3E] hover:bg-[#14532B] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C7A3E]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
