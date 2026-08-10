"use client";

// Last-resort error boundary. `app/error.tsx` cannot catch a failure that happens
// in the root layout itself, so without this file such a crash falls through to an
// unbranded blank Next.js screen. global-error replaces the whole document, which
// is why it renders its own <html> and <body>.
//
// Styles are inline here on purpose: if the root layout failed, the global
// stylesheet may not have been applied, so this page must not depend on it.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Replysis] Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FDFCFA",
          color: "#16150F",
          padding: "24px",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          role="alert"
          style={{
            textAlign: "center",
            maxWidth: "420px",
            width: "100%",
            padding: "32px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E9E7E0",
            borderRadius: "16px",
            boxShadow: "0 6px 20px rgba(22,21,15,0.07)",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            Replysis is temporarily unavailable
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#4A4A41",
              margin: "0 0 28px",
            }}
          >
            Our service encountered a problem, but your account and saved work remain safe.
            Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#FFFFFF",
              backgroundColor: "#1C7A3E",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
