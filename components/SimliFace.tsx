"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { auth } from "../app/firebaseConfig";
import type { TalkingFaceHandle } from "./TalkingFace";

export type SimliStatus = "connecting" | "ready" | "failed";

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

type Client = {
  sendAudioData: (d: Uint8Array) => void;
  ClearBuffer: () => void;
  stop: () => Promise<void>;
  on: (e: "speaking" | "silent", cb: () => void) => void;
};

/**
 * Maya live (owner, 2026-10-26: "real human, not photo"): a Simli video of the real Maya whose lips follow every word.
 * Paid users only; the server refuses a session to anyone else. It connects when the interview starts and hangs up when it
 * ends, so nothing is billed during setup. Same handle as the old photo face, so the interview code did not change.
 *
 * Until she is connected, or if she cannot connect, her voice still plays (straight from the page) over the name card, so
 * an interview never goes silent.
 */
const SimliFace = forwardRef<TalkingFaceHandle, { onStatus?: (s: SimliStatus) => void }>(function SimliFace({ onStatus }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const client = useRef<Client | null>(null);
  const [status, setStatus] = useState<SimliStatus>("connecting");
  const done = useRef<(() => void) | null>(null);      // ends the line being spoken
  const local = useRef<{ ctx: AudioContext; src: AudioBufferSourceNode | null } | null>(null);

  /** Ends the line being spoken now, whatever stage it is at. */
  const finishLine = () => { const d = done.current; done.current = null; d?.(); };

  useEffect(() => { onStatus?.(status); }, [status, onStatus]);

  useEffect(() => {
    let cancelled = false;
    let made: Client | null = null;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("signed out");
        const res = await fetch("/api/simli/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`session ${res.status}`);
        const { sessionToken } = await res.json();
        const { SimliClient, LogLevel } = await import("simli-client/dist/client");   /* not the package index: its import of ./Client has the wrong letter case and fails on Linux */
        if (cancelled || !videoRef.current || !audioRef.current) return;
        const simli = new SimliClient(sessionToken, videoRef.current, audioRef.current, null, LogLevel.ERROR, "livekit");
        const fail = () => { if (!cancelled) { client.current = null; setStatus("failed"); finishLine(); } };
        simli.on("error", fail);
        simli.on("startup_error", fail);
        simli.on("stop", fail);
        // A line has finished when she has spoken and gone quiet again.
        simli.on("silent", () => done.current?.());
        // Waiting for ever would leave the interview without her: 15 seconds, then the voice goes on without the face.
        await Promise.race([
          simli.start(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15_000)),
        ]);
        if (cancelled) { void simli.stop().catch(() => {}); return; }
        made = simli as unknown as Client;
        client.current = made;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
      client.current = null;
      finishLine();
      if (made) void made.stop().catch(() => { /* already closed */ });
      void local.current?.ctx.close().catch(() => {});
      local.current = null;
    };
  }, []);

  /** Plays the voice in the page itself, for when Maya is not connected. */
  const playLocally = (pcm: Int16Array, rate: number) => new Promise<void>((resolve) => {
    try {
      if (!local.current) local.current = { ctx: new AudioContext(), src: null };
      const { ctx } = local.current;
      const buf = ctx.createBuffer(1, pcm.length, rate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      local.current.src = src;
      const end = () => { if (done.current === end) done.current = null; resolve(); };
      done.current = end;
      src.onended = end;
      void ctx.resume().then(() => src.start());
    } catch { resolve(); }
  });

  useImperativeHandle(ref, () => ({
    speak: async (pcm, rate) => {
      finishLine();
      const simli = client.current;
      if (!simli) return playLocally(pcm, rate);
      const pcm16k = resamplePcm16(pcm, rate, 16000);
      const seconds = pcm16k.length / 16000;
      const bytes = new Uint8Array(pcm16k.buffer, pcm16k.byteOffset, pcm16k.byteLength);
      await new Promise<void>((resolve) => {
        // Ends on her going quiet, but never sooner than the words take, nor much later if that signal never comes.
        const started = performance.now();
        let timer: ReturnType<typeof setTimeout>;
        const end = () => {
          const left = seconds * 1000 - (performance.now() - started);
          if (left > 150 && done.current === end) return;          // a pause inside the line, not the end of it
          clearTimeout(timer);
          if (done.current === end) done.current = null;
          resolve();
        };
        done.current = end;
        timer = setTimeout(() => { done.current = null; resolve(); }, seconds * 1000 + 2500);
        const CHUNK = 6000;                                        // about 190 ms
        for (let i = 0; i < bytes.length; i += CHUNK) simli.sendAudioData(bytes.slice(i, i + CHUNK));
      });
    },
    setTalking: () => { /* the browser's own voice cannot move her lips; she stays as she is */ },
    setMood: () => { /* her real face shows her expression by itself */ },
    setListening: () => {},
    stop: () => {
      try { client.current?.ClearBuffer(); } catch { /* nothing playing */ }
      try { local.current?.src?.stop(); } catch { /* not started */ }
      finishLine();
    },
  }), []);

  return (
    <>
      <video ref={videoRef} autoPlay playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: status === "ready" ? 1 : 0, transition: "opacity 0.4s ease" }} />
      <audio ref={audioRef} autoPlay />
    </>
  );
});

export default SimliFace;
