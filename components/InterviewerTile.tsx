"use client";

import { useEffect, useRef, useState } from "react";

export type InterviewerState = "speaking" | "listening" | "thinking" | "idle";

export type Interviewer = {
  id: string;
  name: string;
  title: string;
};

/** The interviewer shown in the mock interview. The loops live at /interviewers/<id>/talking.mp4 and listening.mp4. */
export const DEFAULT_INTERVIEWER: Interviewer = { id: "maya", name: "Maya", title: "Interviewer" };

const STATUS: Record<InterviewerState, string> = {
  speaking: "Speaking",
  listening: "Listening",
  thinking: "Thinking",
  idle: "Ready",
};

/**
 * A video call style interviewer (owner, 2026-10-17: "real human feel").
 *
 * With real footage it plays a talking loop while the interviewer asks and a listening loop while the candidate answers,
 * cross-faded so the switch is not a cut. It is not lip synced, and it says it is an AI interviewer on the name tag.
 * Until the footage exists, or if it cannot load, a portrait card with a speaking pulse takes its place, so the screen is
 * never empty or broken.
 */
export default function InterviewerTile({ state, question, interviewer = DEFAULT_INTERVIEWER, avatar }: {
  state: InterviewerState;
  question: string;
  interviewer?: Interviewer;
  /** The live lip synced face. While its status is "ready" it covers the calm video; otherwise the calm video shows. */
  avatar?: {
    videoRef: React.RefObject<HTMLVideoElement>;
    audioRef: React.RefObject<HTMLAudioElement>;
    status: "off" | "connecting" | "ready" | "failed";
  };
}) {
  const talking = useRef<HTMLVideoElement>(null);
  const listening = useRef<HTMLVideoElement>(null);
  const [talkingReady, setTalkingReady] = useState(false);
  const [listeningReady, setListeningReady] = useState(false);
  const footage = talkingReady && listeningReady;

  const speaking = state === "speaking";

  // Both loops keep playing underneath; only which one is visible changes. Browsers may pause video in a hidden tab.
  useEffect(() => {
    for (const v of [talking.current, listening.current]) {
      if (v && v.paused) void v.play().catch(() => { /* needs a tap first on some phones; the card shows meanwhile */ });
    }
  }, [state, footage]);

  const base = `/interviewers/${interviewer.id}`;

  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0b171b 0%,#10262c 100%)", overflow: "hidden" }}>
      {/* Footage, when it exists */}
      <video ref={listening} src={`${base}/listening.mp4`} poster={`${base}/poster.jpg`} muted loop playsInline autoPlay preload="auto"
        onCanPlay={() => setListeningReady(true)} onError={() => setListeningReady(false)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: footage ? 1 : 0, transition: "opacity 0.35s ease" }} />
      <video ref={talking} src={`${base}/talking.mp4`} poster={`${base}/poster.jpg`} muted loop playsInline autoPlay preload="auto"
        onCanPlay={() => setTalkingReady(true)} onError={() => setTalkingReady(false)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: 0, transition: "opacity 0.35s ease" }} />   {/* off for now: its mouth and hands do not match the words (owner, 2026-10-17). It returns with a lip synced avatar. */}

      {/* The live face. The elements exist from the start because the connection needs them to attach to. */}
      {avatar && (
        <>
          <video ref={avatar.videoRef} autoPlay playsInline muted={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: avatar.status === "ready" ? 1 : 0, transition: "opacity 0.4s ease" }} />
          <audio ref={avatar.audioRef} autoPlay />
        </>
      )}

      {/* Portrait card while there is no footage */}
      {!footage && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 132, height: 132 }}>
            <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "2px solid #1fc98a",
              opacity: speaking ? 0.9 : 0.25, transform: speaking ? "scale(1.06)" : "scale(1)", transition: "all 0.4s ease" }} />
            <div style={{ width: 132, height: 132, borderRadius: "50%", background: "linear-gradient(135deg,#1d6b73,#1a4a56)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 52, fontWeight: 700 }}>
              {interviewer.name.charAt(0)}
            </div>
          </div>
        </div>
      )}

      {/* Top row: live marker */}
      <div style={{ position: "absolute", top: 12, left: 14, display: "flex", alignItems: "center", gap: 7, color: "white",
        fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.45)", padding: "5px 10px", borderRadius: 999 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1fc98a" }} />
        Live interview
      </div>

      {/* Name tag and state */}
      <div style={{ position: "absolute", left: 14, bottom: 58, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "white", fontSize: 12.5, fontWeight: 700, background: "rgba(0,0,0,0.55)", padding: "5px 10px", borderRadius: 8 }}>
          {interviewer.name}, AI {interviewer.title.toLowerCase()}
        </span>
        <span style={{ color: speaking ? "#0b171b" : "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
          background: speaking ? "#1fc98a" : "rgba(255,255,255,0.18)", padding: "5px 9px", borderRadius: 8 }}>
          {STATUS[state]}
        </span>
      </div>

      {/* Subtitle: what is being asked */}
      {state !== "thinking" && (
        <div aria-live="polite" style={{ position: "absolute", left: 14, right: 14, bottom: 12, display: "flex", justifyContent: "center" }}>
          <p style={{ margin: 0, maxWidth: "92%", textAlign: "center", color: "white", fontSize: 13.5, fontWeight: 600, lineHeight: 1.45,
            background: "rgba(0,0,0,0.6)", padding: "7px 14px", borderRadius: 10 }}>
            {question}
          </p>
        </div>
      )}
    </div>
  );
}
