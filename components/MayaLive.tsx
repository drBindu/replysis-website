"use client";

import { useEffect, useRef, useState } from "react";
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
};

/** Maya's live connection: the face handle the interview speaks through, her video, and whether she is there yet. */
export type MayaLive = {
  face: TalkingFaceHandle;
  status: SimliStatus | "off";
  video: HTMLVideoElement | null;
  /** Resolves when she is connected, has failed, or after `ms`, whichever comes first. */
  whenReady: (ms: number) => Promise<void>;
};

/**
 * Maya live (owner, 2026-10-26: "real human, not photo"): a Simli video of the real Maya whose lips follow every word.
 * Paid users only; the server refuses a session to anyone else.
 *
 * She takes 10 to 20 seconds to connect, so the page turns this on at the check screen before "Begin interview" and she
 * is already there when the interview starts (otherwise her first question was spoken before her face appeared). It
 * hangs up when `active` goes false; Simli also ends an idle session after two minutes. The video and audio elements
 * live outside React so the connection survives the screen changing; `MayaVideo` shows the video where it is placed.
 *
 * Until she is connected, or if she cannot connect, her voice still plays from the page over the name card, so an
 * interview never goes silent. Same face handle as the old photo face, so the interview code did not change.
 */
export function useMayaLive(active: boolean, getToken?: () => Promise<string | undefined>, shape: "wide" | "tall" = "wide"): MayaLive {
  const client = useRef<Client | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<SimliStatus | "off">("off");
  const statusRef = useRef<SimliStatus | "off">("off");
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const waiters = useRef<(() => void)[]>([]);
  const done = useRef<(() => void) | null>(null);      // ends the line being spoken
  const local = useRef<{ ctx: AudioContext; src: AudioBufferSourceNode | null } | null>(null);

  const setBoth = (s: SimliStatus | "off") => {
    statusRef.current = s;
    setStatus(s);
    if (s !== "connecting") { const w = waiters.current; waiters.current = []; w.forEach((f) => f()); }
  };

  /** Ends the line being spoken now, whatever stage it is at. */
  const finishLine = () => { const d = done.current; done.current = null; d?.(); };

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let made: Client | null = null;
    const videoEl = document.createElement("video");
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    // Simli sends a square picture. "contain" shows all of her in any window shape (the wide full screen call view
    // cropped her at the eyes with "cover"); the tile's dark background fills the sides.
    videoEl.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;";
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    // iPhone (WKWebView): media must be allowed to play inline, and an element that never had play() called can stay
    // silent even with autoplay; play() is called again once she is connected and before each line (2026-10-27, Maya
    // was silent on a real iPhone while the Simulator played her).
    audioEl.setAttribute("playsinline", "");
    videoEl.setAttribute("playsinline", "");
    videoEl.muted = true;   // her voice comes from the audio element; a muted video always starts on iPhone
    audioRef.current = audioEl;
    // Kept in the page (off screen) until a MayaVideo takes the video, so the browser lets both play.
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;height:240px;overflow:hidden;";
    holder.append(videoEl, audioEl);
    document.body.appendChild(holder);
    setVideo(videoEl);
    setBoth("connecting");
    (async () => {
      try {
        // The phone app's embed passes its own sign-in token; the website uses its own.
        const token = getToken ? await getToken() : await auth.currentUser?.getIdToken();
        if (!token) throw new Error("signed out");
        // A private face test (owner and testers only, checked by the server) passes through from the page's address.
        const test = new URLSearchParams(location.search);
        const testQuery = ["testFace", "w", "h", "x", "y", "zoom"].filter((k) => test.get(k) !== null)
          .map((k) => `&${k}=${encodeURIComponent(test.get(k)!)}`).join("");
        const res = await fetch(`/api/simli/session?shape=${shape}${testQuery}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`session ${res.status}`);
        const { sessionToken } = await res.json();
        const { SimliClient, LogLevel } = await import("simli-client/dist/client");   /* not the package index: its import of ./Client has the wrong letter case and fails on Linux */
        if (cancelled) return;
        const simli = new SimliClient(sessionToken, videoEl, audioEl, null, LogLevel.ERROR, "livekit");
        const fail = () => { if (!cancelled) { client.current = null; setBoth("failed"); finishLine(); } };
        simli.on("error", fail);
        simli.on("startup_error", fail);
        simli.on("stop", fail);
        // A line has finished when she has spoken and gone quiet again.
        simli.on("silent", () => done.current?.());
        // Waiting for ever would leave the interview without her: 30 seconds, then the voice goes on without the face.
        await Promise.race([
          simli.start(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 30_000)),
        ]);
        if (cancelled) { void simli.stop().catch(() => {}); return; }
        made = simli as unknown as Client;
        client.current = made;
        // The iPhone pauses the video when its sound mode changes (the microphone starting or stopping) and her face
        // froze while her voice went on (Mac Claude, 2026-10-27): while she is connected, a pause is undone at once.
        const keepPlaying = () => { if (!cancelled && client.current) void videoEl.play().catch(() => {}); };
        videoEl.addEventListener("pause", keepPlaying);
        audioEl.addEventListener("pause", () => { if (!cancelled && client.current) void audioEl.play().catch(() => {}); });
        void audioEl.play().catch(() => { /* starts with the next line */ });
        void videoEl.play().catch(() => {});
        setBoth("ready");
      } catch {
        if (!cancelled) setBoth("failed");
      }
    })();
    return () => {
      cancelled = true;
      client.current = null;
      finishLine();
      if (made) void made.stop().catch(() => { /* already closed */ });
      void local.current?.ctx.close().catch(() => {});
      local.current = null;
      videoEl.remove();
      holder.remove();
      setVideo(null);
      setBoth("off");
    };
  }, [active]);

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

  const [face] = useState<TalkingFaceHandle>(() => ({
    speak: async (pcm, rate) => {
      finishLine();
      const simli = client.current;
      if (!simli) return playLocally(pcm, rate);
      void audioRef.current?.play().catch(() => {});
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
  }));

  const [whenReady] = useState(() => (ms: number) => new Promise<void>((resolve) => {
    if (statusRef.current !== "connecting") return resolve();
    const t = setTimeout(resolve, ms);
    waiters.current.push(() => { clearTimeout(t); resolve(); });
  }));

  return { face, status, video, whenReady };
}

/**
 * Shows Maya's live video inside its parent (which must be positioned), fading in once she is connected.
 *
 * Her picture is square and the tile is wide (very wide in full screen), so she is shown whole in the middle and the
 * sides are filled by the same picture enlarged and softly blurred, as video call apps do (owner: "fit the window").
 * The fill is redrawn about 8 times a second; it is only a background.
 */
export function MayaVideo({ live }: { live: Pick<MayaLive, "video" | "status"> }) {
  const box = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = live.video;
    const parent = box.current;
    if (!el || !parent) return;
    const before = el.parentElement;
    parent.appendChild(el);
    void el.play().catch(() => { /* starts when the stream arrives */ });
    let timer = 0;
    const draw = () => {
      const c = fill.current;
      const ctx = c?.getContext("2d");
      if (c && ctx && el.videoWidth > 0) {
        if (c.width !== 64) { c.width = 64; c.height = 36; }
        const side = Math.min(el.videoWidth, el.videoHeight * (64 / 36));
        const h = side * (36 / 64);
        ctx.drawImage(el, (el.videoWidth - side) / 2, (el.videoHeight - h) / 2, side, h, 0, 0, 64, 36);
      }
      timer = window.setTimeout(draw, 125);
    };
    draw();
    return () => { window.clearTimeout(timer); if (before?.isConnected) before.appendChild(el); };
  }, [live.video]);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: live.status === "ready" ? 1 : 0, transition: "opacity 0.4s ease" }}>
      <canvas ref={fill} aria-hidden
        style={{ position: "absolute", inset: -40, width: "calc(100% + 80px)", height: "calc(100% + 80px)",
          filter: "blur(28px) brightness(0.8)", transform: "scale(1.05)" }} />
      <div ref={box} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
