// frontend/app/api/credits/deduct/route.ts

import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../../lib/rate-limit";

function getDb() {
  if (getApps().length) return getFirestore();

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("Firebase env vars missing");
    return null;
  }

  try {
    // Try to parse as full JSON service account (new format)
    try {
      const decoded = Buffer.from(privateKeyInput, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (parsed.private_key) {
        initializeApp({
          credential: cert(parsed),
        });
        return getFirestore();
      }
    } catch (e) {
      // Not JSON, fall through to raw key handling
    }

    // Old format  -  raw private key string
    let formattedKey = privateKeyInput;
    if (!formattedKey.includes("-----BEGIN")) {
      formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
    }
    formattedKey = formattedKey.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });

    return getFirestore();
  } catch (e) {
    console.error("Firebase Admin init error:", e);
    return null;
  }
}

const CREDIT_COSTS: Record<string, number> = {
  resume_analysis:        10,
  resume_tailor:          20,
  mock_interview_session: 15,
  mock_feedback:           5,
  mock_script:             5,
  realtime_per_minute:     2,
  question_generation:     5,
  verify_resume:           0,
};

// Monthly caps — must match PLAN_MONTHLY_CREDITS (stt/tokens), PLAN_CONFIG
// (credits.ts) and PLAN_CREDITS (webhook).
const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  free: 100, pro: 5000, lifetime: 5000, teams: 10000,
};
const OWNER_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const MAX_REQUEST_BYTES = 32 * 1024;

function nextResetISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`credits:deduct:${clientIp(req)}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
    }
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ success: false, error: "Request is too large" }, { status: 413 });
    }
    // ── VERIFY FIREBASE ID TOKEN ──────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const db = getDb(); // ensures admin is initialised before auth() call
    if (!db) {
      return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 503 });
    }
    let verifiedUid: string;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      verifiedUid   = decoded.uid;
    } catch {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
    const { uid, action } = body;

    if (typeof uid !== "string" || typeof action !== "string") {
      return NextResponse.json({ success: false, error: "Invalid uid or action" }, { status: 400 });
    }

    // Ensure the token owner matches the requested uid
    if (uid !== verifiedUid) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const cost = CREDIT_COSTS[action];
    if (cost === undefined) {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    if (cost === 0) {
      return NextResponse.json({ success: true, remaining: -1 });
    }

    const userRef = db.collection("users").doc(uid);

    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw Object.assign(new Error("User not found"), { status: 404 });
      }

      const userData = userDoc.data()!;
      const email   = String(userData.email || "").toLowerCase();
      const plan    = userData.plan || "free";
      const cap     = PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
      let   credits = typeof userData.credits === "number" ? userData.credits : cap;

      // Owner/internal account: never charged.
      if (email === OWNER_EMAIL) {
        transaction.update(userRef, { creditsUsed: FieldValue.increment(cost) });
        return { success: true, remaining: -1, plan };
      }

      // Lazy monthly reset: refill to the plan cap once the reset date passes.
      const resetAt = userData.creditsResetDate ? Date.parse(userData.creditsResetDate) : 0;
      let didReset = false;
      if (resetAt && Date.now() >= resetAt) { credits = cap; didReset = true; }

      if (credits < cost) {
        if (didReset) transaction.update(userRef, { credits, creditsUsed: 0, creditsResetDate: nextResetISO() });
        throw Object.assign(new Error("Insufficient credits"), { status: 402, remaining: credits, needed: cost, plan });
      }

      if (didReset) {
        transaction.update(userRef, {
          credits:          credits - cost,
          creditsUsed:      cost,
          creditsResetDate: nextResetISO(),
        });
      } else {
        transaction.update(userRef, {
          credits:     FieldValue.increment(-cost),
          creditsUsed: FieldValue.increment(cost),
        });
      }

      return { success: true, remaining: credits - cost, deducted: cost, plan };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Credit deduction error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: status === 402 ? "Insufficient credits" : "Credit deduction failed", ...(err.remaining !== undefined && { remaining: err.remaining, needed: err.needed, plan: err.plan }) },
      { status }
    );
  }
}
