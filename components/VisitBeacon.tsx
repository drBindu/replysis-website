"use client";

// Tells our own server that a page was opened, so the admin page can show how many people visit. No cookie is set and
// nothing about the visitor is kept beyond a country and a one-day fingerprint (see app/api/visit/route.ts).

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function VisitBeacon() {
  const pathname = usePathname();
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const now = Date.now();
    // The same page twice within 30 seconds is a refresh or a fast tab switch, not a new view.
    if (last.current && last.current.path === pathname && now - last.current.at < 30_000) return;
    last.current = { path: pathname, at: now };
    const timer = setTimeout(() => {
      try {
        fetch("/api/visit", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname, ref: document.referrer || "" }),
        }).catch(() => {});
      } catch { /* a counter must never break a page */ }
    }, 1200);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
