"use client";

import React, { useEffect, useRef, useState } from "react";
import AppWindow, { SAY_TWO_SUM } from "./AppWindow";
import EditorScreen from "./EditorScreen";

/**
 * Stealth mode, shown rather than described: the same moment on two screens. On the left, what the candidate sees, with
 * the Replysis window over the editor. On the right, what the interviewer sees of the shared screen. The switch below
 * shows what would happen with stealth off, which is the whole reason the feature exists.
 */
export default function StealthScene() {
  const [stealth, setStealth] = useState(true);
  const [typed, setTyped] = useState(0);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLElement>(null);

  // Start writing the answer when the demonstration scrolls into view, not before anyone can see it.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setTyped(SAY_TWO_SUM.length); return; }
    let n = 0;
    const timer = setInterval(() => {
      n = Math.min(n + 2, SAY_TWO_SUM.length);
      setTyped(n);
      if (n >= SAY_TWO_SUM.length) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [visible]);

  const finished = typed >= SAY_TWO_SUM.length;
  const say = SAY_TWO_SUM.slice(0, typed);

  return (
    <figure className="hv2-scene" ref={root} aria-label="Stealth mode demonstration">
      <div className="hv2-scene-grid">
        <div>
          <figcaption className="hv2-cap">
            <strong>Your screen</strong>
            The editor, with Replysis open on top of it.
          </figcaption>
          <div className="hv2-screen">
            <EditorScreen />
            <div className="hv2-overlay">
              <AppWindow say={say} typing={visible && !finished} showCode={finished} />
            </div>
          </div>
        </div>

        <div>
          <figcaption className="hv2-cap">
            <strong>The interviewer&apos;s screen</strong>
            What they see while you share. {stealth ? "Only the editor." : "Everything, Replysis included."}
          </figcaption>
          <div className="hv2-screen">
            <div className="hv2-sharebar"><i />You are sharing your screen</div>
            <EditorScreen />
            <div className={`hv2-overlay hv2-exposed${stealth ? " is-hidden" : ""}`} aria-hidden={stealth}>
              <AppWindow say={say} typing={false} showCode={finished} />
              <span className="hv2-exposed-tag">Visible to the interviewer</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hv2-switch">
        <span className="hv2-switch-label" id="stealth-label">Stealth mode</span>
        <div className="hv2-seg" role="group" aria-labelledby="stealth-label">
          <button type="button" aria-pressed={stealth} onClick={() => setStealth(true)}>On</button>
          <button type="button" aria-pressed={!stealth} onClick={() => setStealth(false)}>Off</button>
        </div>
      </div>
      <p className="hv2-scene-note">
        Stealth mode keeps the Replysis window out of screen sharing and recordings on supported setups. Coverage depends on your
        computer and your meeting tool, so test it in your own call before an interview, and follow the rules of the interview you are in.
      </p>
    </figure>
  );
}
