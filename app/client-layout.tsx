"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Footer from "../components/Footer";
import OfflineBanner from "../components/feedback/OfflineBanner";
import CreditUpgradeNotice from "../components/CreditUpgradeNotice";
import FirstRunGuide from "../components/FirstRunGuide";
import { ToastProvider } from "../components/feedback/Toast";
import { useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { doc, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    let exitHandler: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let visHandler: (() => void) | null = null;

    // Clear any timers/listeners from a previous auth state (e.g. token refresh)
    const cleanupListeners = () => {
      if (heartbeat)   { clearInterval(heartbeat); heartbeat = null; }
      if (visHandler)  { document.removeEventListener("visibilitychange", visHandler); visHandler = null; }
      if (exitHandler) { window.removeEventListener("beforeunload", exitHandler); exitHandler = null; }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      cleanupListeners();
      if (!user) return;

      const userRef = doc(db, "users", user.uid);

      // Mark online immediately
      const markActive = () => updateDoc(userRef, { lastActive: serverTimestamp() }).catch(() => {});
      markActive();

      // Heartbeat: every 60s while the tab is visible, refresh lastActive and
      // add 1 minute of usage. This is what keeps the admin "Live" status
      // accurate  -  without it, users flip to "Offline" after 5 minutes.
      heartbeat = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          updateDoc(userRef, {
            lastActive: serverTimestamp(),
            totalMinutesSpent: increment(1),
          }).catch(() => {});
        }
      }, 60000);

      // Re-mark active the instant the user returns to the tab
      visHandler = () => { if (document.visibilityState === "visible") markActive(); };
      document.addEventListener("visibilitychange", visHandler);

      // Per-session tracking  -  fires once per browser tab open
      const sessionKey = "cx_tracked_" + user.uid;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");

        // Async work in a self-contained function so the callback stays sync
        (async () => {
          // Keep login telemetry minimal. IP and precise geolocation are not
          // needed to operate the product and should not be collected by a
          // third-party browser request.
          const loginEntry: Record<string, string> = {
            at: new Date().toISOString(),
          };

          // Write the minimal activity record to Firestore.
          try {
            const update: Record<string, any> = {
              lastLoginAt:  serverTimestamp(),
              lastEntry:    serverTimestamp(),
              loginCount:   increment(1),
              loginHistory: arrayUnion(loginEntry),
            };
            await updateDoc(userRef, update);
          } catch (e) {
            console.error("Session tracking error:", e);
          }
        })();
      }

      // Exit tracking  -  mark the moment they leave
      exitHandler = () => {
        updateDoc(userRef, { lastExit: serverTimestamp() }).catch(() => {});
      };
      window.addEventListener("beforeunload", exitHandler);
    });

    return () => {
      unsubscribe();
      cleanupListeners();
    };
  }, []);

  const isCompanyPage = pathname.startsWith("/company");
  const hideFooter = pathname.startsWith("/resume/editor") || isCompanyPage;

  // `initial={false}` is what keeps the first paint visible: the entry
  // animation is skipped for the page that is already on screen (server render
  // and hydration alike), so nothing is hidden behind opacity:0 and the tree is
  // never remounted. Navigating afterwards changes `key`, and from that point
  // AnimatePresence runs the exit and entry transitions normally.
  const content = isCompanyPage ? (
    <main className="flex flex-col min-h-[80vh]">{children}</main>
  ) : (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="flex flex-col min-h-[80vh]"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );

  return (
    <ToastProvider>
      <OfflineBanner />
      <FirstRunGuide />
      <CreditUpgradeNotice />
      {content}
      {!hideFooter && <Footer />}
    </ToastProvider>
  );
}
