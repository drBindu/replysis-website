"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

export type AvatarStatus = "off" | "connecting" | "ready" | "failed";

/** Resamples 16 bit mono PCM from one rate to another by linear interpolation. Speech needs nothing fancier. */
export function resamplePcm16(input: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (fromRate === toRate) return input;
  const length = Math.floor((input.length * toRate) / fromRate);
  const out = new Int16Array(length);
  const ratio = fromRate / toRate;
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = Math.round(input[i0] * (1 - frac) + input[i1] * frac);
  }
  return out;
}

/**
 * The live lip synced interviewer face (Simli). It starts only while `active` is true (the interview itself), so nothing is
 * billed during setup, and it stops when the interview ends. Any failure leaves status "failed" and the screen falls back
 * to the calm video and the browser voice, so a mock interview never depends on it.
 */
export function useSimliAvatar(active: boolean, user: User | null) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<{ sendAudioData: (d: Uint8Array) => void; ClearBuffer: () => void; stop: () => Promise<void> } | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("off");
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);

  useEffect(() => {
    if (!active || !user) return;
    let cancelled = false;
    let client: typeof clientRef.current = null;
    setStatus("connecting");

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/simli/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`session ${res.status}`);
        const { sessionToken } = await res.json();
        const { SimliClient, LogLevel } = await import("simli-client/dist/client")   /* not the package index: its import of ./Client has the wrong letter case and fails on Linux */;
        if (cancelled || !videoRef.current || !audioRef.current) return;
        const simli = new SimliClient(sessionToken, videoRef.current, audioRef.current, null, LogLevel.ERROR, "livekit");
        simli.on("speaking", () => setAvatarSpeaking(true));
        simli.on("silent", () => setAvatarSpeaking(false));
        simli.on("error", () => { if (!cancelled) setStatus("failed"); });
        simli.on("startup_error", () => { if (!cancelled) setStatus("failed"); });
        simli.on("stop", () => { if (!cancelled) setStatus("failed"); });
        // Waiting for ever for a face would leave the interview silent: give it 15 seconds.
        await Promise.race([
          simli.start(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15_000)),
        ]);
        if (cancelled) { void simli.stop(); return; }
        client = simli;
        clientRef.current = simli;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      setAvatarSpeaking(false);
      setStatus("off");
      clientRef.current = null;
      if (client) void client.stop().catch(() => { /* already closed */ });
    };
  }, [active, user]);

  /** Speaks one question through the face. Resolves when the sound has been handed over; false means use the browser voice. */
  const speak = useCallback(async (text: string, user2: User | null): Promise<number | null> => {
    const client = clientRef.current;
    if (!client || !user2) return null;
    try {
      const token = await user2.getIdToken();
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      const rate = Number(res.headers.get("X-Sample-Rate")) || 24000;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length < 2) return null;
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.length / 2));
      const pcm16k = resamplePcm16(pcm, rate, 16000);
      const out = new Uint8Array(pcm16k.buffer, pcm16k.byteOffset, pcm16k.byteLength);
      const CHUNK = 6000;                                    // about 190 ms
      for (let i = 0; i < out.length; i += CHUNK) client.sendAudioData(out.slice(i, i + CHUNK));
      return pcm16k.length / 16000;                          // seconds of speech
    } catch {
      return null;
    }
  }, []);

  const silence = useCallback(() => { try { clientRef.current?.ClearBuffer(); } catch { /* nothing playing */ } }, []);

  return { videoRef, audioRef, status, avatarSpeaking, speak, silence };
}
