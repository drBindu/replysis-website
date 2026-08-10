"use client";

// Loading placeholders, plus the piece that is usually missing: a way out.
//
// `LoadingRegion` shows a skeleton, but if the work has not finished after a
// sensible wait it stops pretending and offers a retry. That is the difference
// between a slow screen and a screen that is stuck forever.

import { useEffect, useState } from "react";
import InlineError from "./InlineError";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#F0EFE9] ${className}`}
      aria-hidden="true"
    />
  );
}

/** A few stacked lines, sized like body copy. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          // Last line runs short, the way a real paragraph does.
        />
      ))}
    </div>
  );
}

type LoadingRegionProps = {
  isLoading: boolean;
  /** Rendered once loading finishes. */
  children: React.ReactNode;
  /** Shown while loading. Defaults to three lines of text skeleton. */
  skeleton?: React.ReactNode;
  /** How long to wait before treating this as stuck. */
  timeoutMs?: number;
  /** Re-runs the load. Required for the timeout state to be useful. */
  onRetry?: () => void;
  /** Announced to screen readers while loading. */
  label?: string;
};

export function LoadingRegion({
  isLoading,
  children,
  skeleton,
  timeoutMs = 15000,
  onRetry,
  label = "Loading",
}: LoadingRegionProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  if (isLoading && timedOut) {
    return <InlineError kind="timeout" onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{label}</span>
        {skeleton ?? <SkeletonText />}
      </div>
    );
  }

  return <>{children}</>;
}
