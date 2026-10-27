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
import { FREE_TASTES_PER_DAY, MAYA_ADDON, MAYA_CONNECTIONS_PER_DAY } from "../../../../data/mayaAddon";

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
  const params = new URL(req.url).searchParams;
  const shape = params.get("shape") === "tall" ? "tall" : "wide";
  const apiKey = process.env.SIMLI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Live face unavailable" }, { status: 503 });

  const userData = await getFirestore().collection("users").doc(uid).get().then((d) => d.data()).catch(() => undefined);
  const access = userData ? mayaAccess(userData) : null;
  // The owner and testers (internal accounts) are never counted or limited.
  const internal = userData?.internal === true;
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

  // Interviews are counted when one starts (/api/simli/begin), never here. Here: the month's interviews must not all be
  // used, and connections are guarded against abuse only.
  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const usageRef = getFirestore().collection("avatar_usage").doc(`${uid}_${day}`);
  const monthRef = getFirestore().collection("avatar_usage").doc(`${uid}_${month}`);
  const allowed = internal ? "ok" : await getFirestore().runTransaction(async (tx) => {
    const connections = Number((await tx.get(usageRef)).data()?.sessions ?? 0);
    const interviews = Number((await tx.get(monthRef)).data()?.interviews ?? 0);
    if (connections >= MAYA_CONNECTIONS_PER_DAY) return "day";
    if (!taste && interviews >= access.monthly) return "month";
    tx.set(usageRef, { uid, day, sessions: connections + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return "ok";
  }).catch(() => "error");
  if (allowed !== "ok") {
    return NextResponse.json({ error: allowed === "month" ? "Monthly interviews used" : "Too many connections today" }, { status: 429 });
  }

  // Private test of a face (owner and testers only, 2026-10-27): ?testFace=<id>&w=&h=&x=&y=&zoom= on the session request
  // tries another face and framing without touching what customers get.
  const test: { faceId: string; trinity2: boolean; size?: Record<string, number>; extra?: Record<string, unknown> } = {
    faceId: process.env.SIMLI_FACE_ID || DEFAULT_FACE_ID,
    trinity2: process.env.SIMLI_FACE_KIND === "trinity2",
  };
  const testFace = params.get("testFace");
  if (internal && testFace && /^[0-9a-f-]{36}$/.test(testFace)) {
    test.faceId = testFace;
    test.trinity2 = true;
    const num = (k: string) => { const v = Number(params.get(k)); return Number.isFinite(v) && params.get(k) !== null ? v : undefined; };
    const w = num("w"), h = num("h");
    if (w && h) test.size = { streaming_width: w, streaming_height: h };
    const x = num("x"), y = num("y"), zoom = num("zoom");
    test.extra = {
      ...(x !== undefined ? { avatar_position_x: x } : {}),
      ...(y !== undefined ? { avatar_position_y: y } : {}),
      ...(zoom !== undefined ? { camera: { zoom } } : {}),
    };
  }

  try {
    const res = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-simli-api-key": apiKey },
      body: JSON.stringify({
        faceId: test.faceId,
        apiVersion: "v2",
        handleSilence: true,
        maxSessionLength: taste ? MAYA_ADDON.tasteSeconds : MAX_SESSION_SECONDS,
        maxIdleTime: MAX_IDLE_SECONDS,
        audioInputFormat: "pcm16",
        // A Trinity-2 face (SIMLI_FACE_KIND=trinity2) can stream the shape of the screen it is shown on: wide for a
        // laptop, tall for a phone, so she fills it without bars. Older faces keep their own square frame. The smallest size
        // Simli takes (512 on the short side): 1280x720 lagged for the owner (2026-10-27).
        ...(test.trinity2
          ? test.size ?? (shape === "tall" ? { streaming_width: 512, streaming_height: 910 } : { streaming_width: 910, streaming_height: 512 })
          : {}),
        ...(test.extra ?? {}),
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
