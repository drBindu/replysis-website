"use client";

// A persistent bar shown while the browser reports no connection.
//
// It stays until the connection is genuinely back rather than disappearing on
// the first `online` event, because that event fires as soon as an interface
// comes up, which is often before anything can actually be reached. The brief
// "You are back online" confirmation then clears itself.

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justRecovered, setJustRecovered] = useState(false);

  useEffect(() => {
    // navigator.onLine is only meaningful in the browser, so the initial read
    // happens here rather than in the initial state.
    setIsOffline(navigator.onLine === false);

    const handleOffline = () => {
      setIsOffline(true);
      setJustRecovered(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustRecovered(true);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Drop the recovery confirmation on its own so it does not linger.
  useEffect(() => {
    if (!justRecovered) return;
    const timer = setTimeout(() => setJustRecovered(false), 4000);
    return () => clearTimeout(timer);
  }, [justRecovered]);

  if (!isOffline && !justRecovered) return null;

  const offlineStyles = {
    background: "#FBF3E8",
    borderColor: "#E8D9BE",
    color: "#5C4A22",
  };
  const recoveredStyles = {
    background: "#EEF7EF",
    borderColor: "#C7E4CE",
    color: "#14532B",
  };
  const styles = isOffline ? offlineStyles : recoveredStyles;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[400] border-b px-4 py-2 text-center text-[12.5px] font-semibold"
      style={styles}
    >
      {isOffline
        ? "You are offline. Your session is safe and we will reconnect automatically."
        : "You are back online."}
    </div>
  );
}
