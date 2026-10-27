// A short lived Simli session token for the live interviewer face. The Simli API key never leaves the server.
//
// Paid plans with the Maya add-on only (owner, 2026-10-26): everyone else is refused here, not just hidden in the page.
// The add-on carries a number of interviews a month (see data/mayaAddon.ts); each live session counts as one.
//
// Cost control: Simli bills by the minute of a connected session, so a session is capped in length and idle time, and each
// person gets only a few a day.

import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../../lib/rate-limit";
import { verifiedUid } from "../../../lib/verify-user";
import { mayaAccess } from "../../../lib/paid-plan";
import { FREE_TASTES_PER_DAY, MAYA_ADDON, MAYA_SESSIONS_PER_DAY } from "../../../../data/mayaAddon";

export const dynamic = "force-dynamic";

/** Kate, one of Simli's ready made faces, only until SIMLI_FACE_ID (our own Maya, made from her Flow video) is set. */
const DEFAULT_FACE_ID = "d2a5c7c6-fed9-4f55-bcb3-062f7cd20103";
const MAX_SESSION_SECONDS = 900;       // 15 minutes
const MAX_IDLE_SECONDS = 120;


export async function POST(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`simli:${uid}`, 6, 60 * 60_000).ok || !rateLimit(`simli-ip:${clientIp(req)}`, 20, 60 * 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const apiKey = process.env.SIMLI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Live face unavailable" }, { status: 503 });

  const access = await getFirestore().collection("users").doc(uid).get()
    .then((d) => mayaAccess(d.data())).catch(() => null);
  if (!access || (access.state !== "ok" && access.state !== "taste")) {
    return NextResponse.json({ error: "Maya add-on required" }, { status: 403 });
  }
  // The free interview is used up the moment its session is made (claimed in a transaction, so two tabs cannot both
  // have it), and it is short.
  const taste = access.state === "taste";
  if (taste) {
    const userRef = getFirestore().collection("users").doc(uid);
    const dayRef = getFirestore().collection("avatar_usage").doc(`free_${new Date().toISOString().slice(0, 10)}`);
    const claimed = await getFirestore().runTransaction(async (tx) => {
      if ((await tx.get(userRef)).data()?.mayaFreeUsed === true) return "used";
      const today = Number((await tx.get(dayRef)).data()?.sessions ?? 0);
      if (today >= FREE_TASTES_PER_DAY) return "full";
      tx.set(dayRef, { sessions: today + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(userRef, { mayaFreeUsed: true, mayaFreeUsedAt: FieldValue.serverTimestamp() }, { merge: true });
      return "ok";
    }).catch(() => "error");
    if (claimed !== "ok") {
      return NextResponse.json({ error: claimed === "full" ? "Free interviews full today" : "Free interview already used" }, { status: 403 });
    }
  }

  // Counted per day and per month before the session is made, so a failure to count cannot give free sessions.
  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const usageRef = getFirestore().collection("avatar_usage").doc(`${uid}_${day}`);
  const monthRef = getFirestore().collection("avatar_usage").doc(`${uid}_${month}`);
  const allowed = await getFirestore().runTransaction(async (tx) => {
    const used = Number((await tx.get(usageRef)).data()?.sessions ?? 0);
    const usedMonth = Number((await tx.get(monthRef)).data()?.sessions ?? 0);
    if (used >= MAYA_SESSIONS_PER_DAY) return "day";
    if (!taste && usedMonth >= access.monthly) return "month";
    tx.set(usageRef, { uid, day, sessions: used + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(monthRef, { uid, month, sessions: usedMonth + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return "ok";
  }).catch(() => "error");
  if (allowed !== "ok") {
    return NextResponse.json({ error: allowed === "month" ? "Monthly limit reached" : "Daily limit reached" }, { status: 429 });
  }

  try {
    const res = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-simli-api-key": apiKey },
      body: JSON.stringify({
        faceId: process.env.SIMLI_FACE_ID || DEFAULT_FACE_ID,
        apiVersion: "v2",
        handleSilence: true,
        maxSessionLength: taste ? MAYA_ADDON.tasteSeconds : MAX_SESSION_SECONDS,
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
    return NextResponse.json({ sessionToken: data.session_token, maxSeconds: taste ? MAYA_ADDON.tasteSeconds : MAX_SESSION_SECONDS },
      { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[simli] token request error:", (e as Error)?.name ?? "Error");
    return NextResponse.json({ error: "Live face unavailable" }, { status: 502 });
  }
}
