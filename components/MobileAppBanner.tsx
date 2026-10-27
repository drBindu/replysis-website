"use client";

import { useEffect, useState } from "react";
import { STORE_LINKS } from "../data/storeLinks";

/**
 * On a phone, a slim bar at the bottom: "Get the Replysis app" with the store for that phone (Google Play on Android,
 * the App Store on iPhone). Shows nothing until that store's link is set in data/storeLinks.ts, on computers, inside the
 * phone app's own web views, or once closed (remembered on that phone).
 */
export default function MobileAppBanner() {
  const [store, setStore] = useState<{ name: string; href: string } | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/ReplysisApp|wv\)/.test(ua) || location.pathname.startsWith("/maya-embed")) return;
    try { if (localStorage.getItem("replysis-app-banner-closed") === "1") return; } catch { /* storage blocked */ }
    if (/Android/i.test(ua) && STORE_LINKS.googlePlay) setStore({ name: "Google Play", href: STORE_LINKS.googlePlay });
    else if (/iPhone|iPad|iPod/i.test(ua) && STORE_LINKS.appStore) setStore({ name: "the App Store", href: STORE_LINKS.appStore });
  }, []);

  if (!store) return null;
  const close = () => {
    try { localStorage.setItem("replysis-app-banner-closed", "1"); } catch { /* storage blocked */ }
    setStore(null);
  };
  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 900, display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px 10px 16px", borderRadius: 14, background: "#10262c", color: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      <span style={{ flex: 1, fontSize: 14, lineHeight: 1.35 }}>Get the Replysis app on {store.name}</span>
      <a href={store.href} style={{ padding: "10px 14px", borderRadius: 10, background: "#1fc98a", color: "#0b171b", fontWeight: 700,
        fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
        Get app
      </a>
      <button onClick={close} aria-label="Close" style={{ width: 36, height: 36, border: 0, background: "transparent", color: "white",
        fontSize: 20, cursor: "pointer" }}>×</button>
    </div>
  );
}
