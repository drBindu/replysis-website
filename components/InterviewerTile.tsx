"use client";

import type { RefObject } from "react";
import TalkingFace, { type TalkingFaceHandle } from "./TalkingFace";

export type InterviewerState = "speaking" | "listening" | "thinking" | "idle";

export type Interviewer = {
  id: string;
  name: string;
  title: string;
};

/** The interviewer shown in the mock interview. Her face lives at /interviewers/<id>/face (a photo and expression patches). */
export const DEFAULT_INTERVIEWER: Interviewer = { id: "maya", name: "Maya", title: "Interviewer" };

const STATUS: Record<InterviewerState, string> = {
  speaking: "Speaking",
  listening: "Listening",
  thinking: "Thinking",
  idle: "Ready",
};

/**
 * A video call style interviewer (owner, 2026-10-17: "real human feel", lips matching the voice, free to run).
 *
 * The face is TalkingFace: one photo whose mouth follows the spoken audio and which blinks and moves slightly. The name tag
 * says it is an AI interviewer. If the face cannot load, a portrait card with a speaking ring takes its place.
 */
export default function InterviewerTile({ state, interviewer = DEFAULT_INTERVIEWER, faceRef }: {
  state: InterviewerState;
  /** Kept for callers; the question is not shown on the face (owner: no captions). */
  question?: string;
  interviewer?: Interviewer;
  /** Lets the interview speak through the face. */
  faceRef?: RefObject<TalkingFaceHandle | null>;
}) {
  const speaking = state === "speaking";

  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0b171b 0%,#10262c 100%)", overflow: "hidden" }}>
      {/* Portrait card underneath; the face covers it as soon as its images load */}
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

      <TalkingFace ref={faceRef} base={`/interviewers/${interviewer.id}/face`} />

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

    </div>
  );
}
