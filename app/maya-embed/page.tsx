"use client";

import { useEffect, useRef, useState } from "react";
import { MayaVideo, useMayaLive } from "../../components/MayaLive";

/**
 * Live Maya for the phone app (2026-10-26): the app shows this page full size inside its interview screen, so the phone
 * and the website use one and the same Maya. Nothing else is on the page.
 *
 * Messages from the app (JSON strings):
 *   {type: "start", token}            the person's Firebase ID token; Maya starts joining (paid add-on checked by the server)
 *   {type: "speak", id, rate, pcm}    one line: base64 16 bit mono PCM at `rate`
 *   {type: "stop"}                    stop talking now
 * Messages to the app: {type: "status", status} ("connecting" | "ready" | "failed") and {type: "done", id}.
 */
type AppMessage = { type: "start"; token: string } | { type: "speak"; id: string; rate: number; pcm: string } | { type: "stop" };

declare global {
  interface Window { ReactNativeWebView?: { postMessage: (s: string) => void } }
}

const toApp = (m: object) => window.ReactNativeWebView?.postMessage(JSON.stringify(m));

function decodePcm(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
}

export default function MayaEmbed() {
  const token = useRef<string | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const [getToken] = useState(() => async () => token.current);
  const maya = useMayaLive(started, getToken);
  const [interviewId] = useState(() => `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => { if (maya.status !== "off") toApp({ type: "status", status: maya.status }); }, [maya.status]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      let m: AppMessage;
      try { m = JSON.parse(typeof e.data === "string" ? e.data : ""); } catch { return; }
      if (m.type === "start" && typeof m.token === "string") {
        token.current = m.token;
        setStarted(true);
        // The phone opens this page for one interview: it counts as one of the month's Maya interviews.
        void fetch("/api/simli/begin", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.token}` },
          body: JSON.stringify({ id: interviewId }),
        }).catch(() => {});
      }
      else if (m.type === "speak") {
        void maya.face.speak(decodePcm(m.pcm), m.rate).then(() => toApp({ type: "done", id: m.id }));
      } else if (m.type === "stop") maya.face.stop();
    };
    // Android's WebView delivers to document, iOS to window.
    window.addEventListener("message", onMessage);
    document.addEventListener("message", onMessage as EventListener);
    toApp({ type: "loaded" });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("message", onMessage as EventListener);
    };
  }, [maya.face, interviewId]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0b171b" }}>
      <MayaVideo live={maya} />
    </div>
  );
}
