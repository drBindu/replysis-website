import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Same initialisation as the STT token route: firebase-admin is a singleton
// per process, so whichever route runs first wins and the other reuses it.
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

if (!getApps().length && projectId && clientEmail && privateKeyInput) {
  try {
    let formattedKey = privateKeyInput;
    if (!formattedKey.startsWith("---")) {
      formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
    }
    formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formattedKey }) });
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

const db = getApps().length ? getFirestore() : null;

/**
 * Where the website reports how long it has been listening.
 *
 * Credits count questions. Speechmatics charges by the hour of audio, so
 * until this existed the expensive half of the bill was simply not measured:
 * a microphone held open all afternoon cost real money and showed up nowhere.
 *
 * Writes the same `audioMinutesUsed` field on the same user document as the
 * Java backend, so somebody using the website and the desktop app has one
 * allowance rather than two that each look generous on their own.
 *
 * Reports arrive while the interview is happening, not at the end. A closed
 * tab, a crashed browser and a dropped connection all look identical from
 * here, and all three would otherwise have listened for free.
 */

const PLAN_MONTHLY_AUDIO_MINUTES: Record<string, number> = {
  free:       60,
  pro:       900,
  max:      1800,
  lifetime: 1800,
  teams:    6000,
};

// A minute of real listening cannot arrive more than once a minute. Loose
// enough for retries and a second tab, tight enough that a loop cannot
// hammer Firestore.
const REPORTS_PER_MINUTE = 10;
const seen = new Map<string, { count: number; resetAt: number }>();

function withinRate(key: string): boolean {
  const now = Date.now();
  const cur = seen.get(key);
  if (!cur || now >= cur.resetAt) {
    seen.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  cur.count += 1;
  if (seen.size > 5_000) {
    for (const [k, v] of seen) if (now >= v.resetAt) seen.delete(k);
  }
  return cur.count <= REPORTS_PER_MINUTE;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded?.uid;
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!withinRate(`usage:${uid}`)) {
      return NextResponse.json(
        { error: "Too many usage reports" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // Anything unreadable counts as one minute rather than zero. A client
    // that reports badly must never end up cheaper than one that reports
    // properly, which is what rounding a broken payload down would reward.
    let minutes = 1;
    try {
      const body = await req.json();
      const raw = Number(body?.minutes);
      if (Number.isFinite(raw)) minutes = Math.max(0, Math.min(120, Math.trunc(raw)));
    } catch {
      minutes = 1;
    }

    if (!db) {
      return NextResponse.json({ usedMinutes: 0, allowanceMinutes: 0, remainingMinutes: -1 });
    }

    const userRef = db.collection("users").doc(uid);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? (snap.data() ?? {}) : {};
      const plan = typeof data.plan === "string" ? data.plan : "free";
      const allowance = PLAN_MONTHLY_AUDIO_MINUTES[plan] ?? PLAN_MONTHLY_AUDIO_MINUTES.free;

      // Shares the credits reset date, so a user's month is one month rather
      // than two that drift apart and confuse everybody.
      const resetAt = data.creditsResetDate ? Date.parse(data.creditsResetDate) : 0;
      let used = Math.max(0, Number(data.audioMinutesUsed ?? 0));
      if (resetAt && Date.now() >= resetAt) used = 0;

      used += minutes;
      if (snap.exists) tx.update(userRef, { audioMinutesUsed: used });

      return { used, allowance };
    });

    return NextResponse.json({
      usedMinutes: result.used,
      allowanceMinutes: result.allowance,
      remainingMinutes: Math.max(0, result.allowance - result.used),
    });
  } catch (err) {
    console.error("Listening usage report error:", err);
    // Never fail an interview over accounting. The minute is lost, not the call.
    return NextResponse.json({ usedMinutes: 0, allowanceMinutes: 0, remainingMinutes: -1 });
  }
}
