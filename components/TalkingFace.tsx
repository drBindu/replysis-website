"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

type Patch = { x: number; y: number; w: number; h: number };
type FaceSpec = { width: number; height: number; patches: Record<string, Patch> };
type Shape = "closed" | "slight" | "ah" | "oh" | "ee";

export type TalkingFaceHandle = {
  /** Plays 16 bit mono PCM and moves the mouth with it. Resolves when the sound has finished. */
  speak: (pcm: Int16Array, sampleRate: number) => Promise<void>;
  /** For a voice we cannot hear inside the page (the browser's own): a generic talking movement while true. */
  setTalking: (on: boolean) => void;
  /** Her expression, faded in over a quarter second: the same five as the phone app (2026-10-26). */
  setMood: (mood: Mood) => void;
  /** While the candidate answers she nods now and then, as a listener does. */
  setListening: (on: boolean) => void;
  stop: () => void;
};

export type Mood = "neutral" | "curious" | "serious" | "smile" | "soft";
const MOODS: Exclude<Mood, "neutral">[] = ["curious", "serious", "smile", "soft"];

const FRAME_SECONDS = 0.04;   // 25 mouth decisions a second

/**
 * Picks a mouth shape for every 40 ms of the voice, from how loud it is and what kind of sound it is.
 * Quiet is a closed mouth; hissing, bright sounds (s, ee) show teeth; dark round sounds (oh, oo) round the lips; the rest
 * open. Each shape is held at least two frames so the mouth never flickers. Exported for testing.
 */
export function mouthTrack(pcm: Int16Array, sampleRate: number): Shape[] {
  const step = Math.max(1, Math.round(sampleRate * FRAME_SECONDS));
  const frames: { rms: number; zcr: number; low: number }[] = [];
  const a = 1 - Math.exp((-2 * Math.PI * 600) / sampleRate);   // one pole low pass at about 600 Hz
  let lp = 0;
  for (let start = 0; start < pcm.length; start += step) {
    const end = Math.min(pcm.length, start + step);
    let sum = 0, lowSum = 0, crossings = 0, prev = pcm[start] ?? 0;
    for (let i = start; i < end; i++) {
      const x = pcm[i] / 32768;
      lp += a * (x - lp);
      sum += x * x;
      lowSum += lp * lp;
      if ((pcm[i] >= 0) !== (prev >= 0)) crossings++;
      prev = pcm[i];
    }
    const n = Math.max(1, end - start);
    frames.push({ rms: Math.sqrt(sum / n), zcr: crossings / n, low: sum > 0 ? lowSum / sum : 0 });
  }
  const peak = Math.max(1e-6, ...frames.map((f) => f.rms));
  const raw: Shape[] = frames.map((f) => {
    const r = f.rms / peak;
    if (r < 0.12) return "closed";
    if (f.zcr > 0.15) return "ee";
    if (r < 0.3) return "slight";
    if (f.low > 0.78) return "oh";
    return "ah";
  });
  // Hold each shape for at least two frames, and a closed mouth only when the quiet lasts.
  const out: Shape[] = [];
  let current: Shape = "closed", held = 99;
  for (const s of raw) {
    if (s !== current && held >= 2) { current = s; held = 0; }
    out.push(current);
    held++;
  }
  return out;
}

/**
 * Maya's face, drawn on a canvas from one photo and five expression patches (mouth shapes and a blink), all made from the
 * same image so only the mouth and eyes ever change. The mouth follows the voice frame by frame, she blinks every few
 * seconds, and the head moves very slightly, as people do on a call. Free to run: no avatar service.
 */
const TalkingFace = forwardRef<TalkingFaceHandle, { base?: string }>(function TalkingFace({ base = "/interviewers/maya/face" }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spec, setSpec] = useState<FaceSpec | null>(null);
  const images = useRef<Record<string, HTMLImageElement>>({});
  const shapeRef = useRef<Shape>("closed");
  const blinkRef = useRef(false);
  const talkingRef = useRef(false);
  const moodRef = useRef<Mood>("neutral");
  const listeningRef = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const track = useRef<{ shapes: Shape[]; startAt: number } | null>(null);

  // Load the photo and the patches.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`${base}/face.json`);
      if (!res.ok) return;
      const s = (await res.json()) as FaceSpec;
      const names = ["base", ...Object.keys(s.patches)];
      await Promise.all(names.map((n) => new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = `${base}/${n === "base" ? "base.jpg" : `${n}.png`}`;
        images.current[n] = img;
      })));
      if (!cancelled) setSpec(s);
    })().catch(() => { /* the tile keeps its card */ });
    return () => { cancelled = true; };
  }, [base]);

  // Draw loop: mouth from the voice (or the generic movement), blinks, and a slight sway.
  useEffect(() => {
    if (!spec) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = spec.width;
    canvas.height = spec.height;
    let frame = 0;
    let nextBlink = performance.now() + 2500 + Math.random() * 2500;
    let blinkUntil = 0;
    // Expression fades (0 to 1 each), nods and the moment the mouth last closed, for the emphasis nod.
    const fade: Record<string, number> = { curious: 0, serious: 0, smile: 0, soft: 0 };
    let last = performance.now();
    let nodStart = -1e9, nodDepth = 0;
    let nextListenNod = performance.now() + 3500;
    let lastShape: Shape = "closed", closedSince = performance.now();
    let genericShape: Shape = "closed";
    let genericUntil = 0;
    const order: Shape[] = ["slight", "ah", "ee", "slight", "oh", "ah", "closed", "slight", "ah"];

    const draw = (now: number) => {
      // Mouth
      let shape: Shape = "closed";
      const t = track.current;
      if (t && audioCtx.current) {
        const i = Math.floor((audioCtx.current.currentTime - t.startAt) / FRAME_SECONDS);
        shape = i >= 0 && i < t.shapes.length ? t.shapes[i] : "closed";
      } else if (talkingRef.current) {
        if (now > genericUntil) {
          genericShape = order[Math.floor(Math.random() * order.length)];
          genericUntil = now + 110 + Math.random() * 90;
        }
        shape = genericShape;
      }
      shapeRef.current = shape;
      // Eyes
      if (now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2800 + Math.random() * 3200; }
      blinkRef.current = now < blinkUntil;

      // Expressions: the broad smile has its own mouth, so while she talks the soft smile stands in under the mouth.
      const dt = Math.min(100, now - last); last = now;
      const want = moodRef.current === "smile" && shape !== "closed" ? "soft" : moodRef.current;
      for (const m of MOODS) fade[m] += ((m === want ? 1 : 0) - fade[m]) * Math.min(1, dt / 90);
      // Nods: now and then while listening, and a small one when she opens her mouth wide after a pause.
      if (listeningRef.current && now > nextListenNod) { nodStart = now; nodDepth = 1; nextListenNod = now + 3500 + Math.random() * 3500; }
      if (shape === "closed" && lastShape !== "closed") closedSince = now;
      if (shape === "ah" && lastShape === "closed" && now - closedSince > 350) { nodStart = now; nodDepth = 0.5; }
      lastShape = shape;
      const nt = (now - nodStart) / 600;
      const nod = nt >= 0 && nt < 1 ? Math.sin(nt * Math.PI) * nodDepth : 0;

      ctx.drawImage(images.current.base, 0, 0);
      for (const m of MOODS) {
        if (fade[m] < 0.01) continue;
        const p = spec.patches[`expr_${m}`];
        const img = images.current[`expr_${m}`];
        if (!p || !img?.complete) continue;
        ctx.globalAlpha = fade[m];
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
        ctx.globalAlpha = 1;
      }
      if (shape !== "closed") {
        const p = spec.patches[`mouth_${shape}`];
        const img = images.current[`mouth_${shape}`];
        if (p && img?.complete) ctx.drawImage(img, p.x, p.y, p.w, p.h);
      }
      // The blink was made from her neutral eyes, so it shows only while her eyes are neutral.
      if (blinkRef.current && (moodRef.current === "neutral" || moodRef.current === "soft")) {
        const p = spec.patches.eyes_closed;
        const img = images.current.eyes_closed;
        if (p && img?.complete) ctx.drawImage(img, p.x, p.y, p.w, p.h);
      }
      // A person on a call is never perfectly still: a very small, slow sway, a little more while speaking.
      const speaking = shape !== "closed" || talkingRef.current || !!track.current;
      const amp = speaking ? 1.8 : 1.2;
      const s = now / 1000;
      const breath = 1.03 + Math.sin(s * 1.5) * 0.003;
      canvas.style.transform =
        `translate(${(Math.sin(s * 0.7) * amp).toFixed(2)}px, ${(Math.sin(s * 0.9 + 1) * amp * 0.6 + nod * 5).toFixed(2)}px) ` +
        `rotate(${(Math.sin(s * 0.5) * 0.45 * (speaking ? 1.3 : 1)).toFixed(3)}deg) scale(${breath.toFixed(4)})`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [spec]);

  const stop = useCallback(() => {
    try { source.current?.stop(); } catch { /* not playing */ }
    source.current = null;
    track.current = null;
    talkingRef.current = false;
  }, []);

  useImperativeHandle(ref, () => ({
    speak: async (pcm, sampleRate) => {
      stop();
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtx.current) audioCtx.current = new AC();
      const ac = audioCtx.current;
      if (ac.state === "suspended") await ac.resume().catch(() => { /* resumed by the next tap */ });
      const buffer = ac.createBuffer(1, pcm.length, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;
      const node = ac.createBufferSource();
      node.buffer = buffer;
      node.connect(ac.destination);
      const startAt = ac.currentTime + 0.05;
      track.current = { shapes: mouthTrack(pcm, sampleRate), startAt };
      source.current = node;
      await new Promise<void>((resolve) => {
        node.onended = () => resolve();
        node.start(startAt);
      });
      if (source.current === node) { source.current = null; track.current = null; }
    },
    setTalking: (on) => { talkingRef.current = on; },
    setMood: (m) => { moodRef.current = m; },
    setListening: (on) => { listeningRef.current = on; },
    stop,
  }), [stop]);

  useEffect(() => () => { stop(); void audioCtx.current?.close().catch(() => {}); }, [stop]);

  return (
    <canvas ref={canvasRef} aria-label="Maya, AI interviewer"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        opacity: spec ? 1 : 0, transition: "opacity 0.4s ease", willChange: "transform" }} />
  );
});

export default TalkingFace;
