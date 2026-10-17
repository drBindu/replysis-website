// A short lived Simli session token for the live interviewer face. The Simli API key never leaves the server.
//
// Cost control: Simli bills by the minute of a connected session, so a session is capped in length and idle time, and each
// person gets only a few a day.

import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../../lib/rate-limit";
import { verifiedUid } from "../../../lib/verify-user";

export const dynamic = "force-dynamic";

/** Kate, one of Simli's ready made faces (a woman). Replaced by our own Maya face with SIMLI_FACE_ID once it exists. */
const DEFAULT_FACE_ID = "d2a5c7c6-fed9-4f55-bcb3-062f7cd20103";
const MAX_SESSION_SECONDS = 900;       // 15 minutes
const MAX_IDLE_SECONDS = 120;
const SESSIONS_PER_DAY = 4;

export async function POST(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`simli:${uid}`, 6, 60 * 60_000).ok || !rateLimit(`simli-ip:${clientIp(req)}`, 20, 60 * 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const apiKey = process.env.SIMLI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Live face unavailable" }, { status: 503 });

  // A daily allowance per person, counted before the session is made so a failure to count cannot give free sessions.
  const day = new Date().toISOString().slice(0, 10);
  const usageRef = getFirestore().collection("avatar_usage").doc(`${uid}_${day}`);
  const allowed = await getFirestore().runTransaction(async (tx) => {
    const used = Number((await tx.get(usageRef)).data()?.sessions ?? 0);
    if (used >= SESSIONS_PER_DAY) return false;
    tx.set(usageRef, { uid, day, sessions: used + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  }).catch(() => false);
  if (!allowed) return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });

  try {
    const res = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-simli-api-key": apiKey },
      body: JSON.stringify({
        faceId: process.env.SIMLI_FACE_ID || DEFAULT_FACE_ID,
        apiVersion: "v2",
        handleSilence: true,
        maxSessionLength: MAX_SESSION_SECONDS,
        maxIdleTime: MAX_IDLE_SECONDS,
        audioInputFormat: "pcm16",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.session_token !== "string") {
      console.error(`[simli] token request failed: HTTP ${res.status}`);
      return NextResponse.json({ error: "Live face unavailable" }, { status: 502 });
    }
    return NextResponse.json({ sessionToken: data.session_token, maxSeconds: MAX_SESSION_SECONDS },
      { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[simli] token request error:", (e as Error)?.name ?? "Error");
    return NextResponse.json({ error: "Live face unavailable" }, { status: 502 });
  }
}
