// app/api/sessions/route.ts
// Handles session save (POST) and load (GET) via Firebase Admin SDK,
// bypassing Firestore client security rules entirely.
//
// Auth: every request must carry a Firebase ID token in the
// Authorization: Bearer <token> header. The token is verified
// server-side and the verified email must match the requested email.

import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../lib/rate-limit";

const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_TURNS = 200;
const MAX_TURN_CHARS = 8_000;
const MAX_SESSION_TEXT_CHARS = 160;

function requestTooLarge(req: Request): boolean {
  const contentLength = Number(req.headers.get("content-length") || "0");
  return Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES;
}

function safeText(value: unknown, maximumLength: number, fallback = ""): string | null {
  if (value == null) return fallback;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length <= maximumLength ? text : null;
}

function sanitizeTurns(value: unknown): Array<{ role: "interviewer" | "candidate"; text: string }> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TURNS) return null;
  const turns = value.map((turn) => {
    if (!turn || typeof turn !== "object") return null;
    const candidate = turn as { role?: unknown; text?: unknown };
    if (candidate.role !== "interviewer" && candidate.role !== "candidate") return null;
    const text = safeText(candidate.text, MAX_TURN_CHARS);
    return text ? { role: candidate.role, text } : null;
  });
  return turns.every(Boolean) ? turns as Array<{ role: "interviewer" | "candidate"; text: string }> : null;
}

// ── Admin init ───────────────────────────────────────────────────
function getDb(): Firestore | null {
  if (getApps().length) return getFirestore();

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("[sessions] Firebase env vars missing");
    return null;
  }

  try {
    // Try JSON service-account blob (base64-encoded)
    try {
      const decoded = Buffer.from(privateKeyInput, "base64").toString("utf8");
      const parsed  = JSON.parse(decoded);
      if (parsed.private_key) {
        initializeApp({ credential: cert(parsed) });
        return getFirestore();
      }
    } catch {}

    // Fallback: raw private key string
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: key }),
    });
    return getFirestore();
  } catch (e) {
    console.error("[sessions] Admin init error:", e);
    return null;
  }
}

// ── Auth helper ─────────────────────────────────────────────────
// Verifies the Firebase ID token in the Authorization header.
// Returns the verified email on success, null on failure.
async function verifyAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  try {
    // Ensure Admin SDK is initialised before calling auth()
    getDb();
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.email ?? null;
  } catch (e) {
    console.warn("[sessions] Token verification failed:", (e as Error).message);
    return null;
  }
}

// ── GET /api/sessions?email=... ──────────────────────────────────
export async function GET(req: Request) {
  const rl = rateLimit(`sessions:get:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }
  const verifiedEmail = await verifyAuth(req);
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedEmail   = searchParams.get("email");

  if (!requestedEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // Enforce: the authenticated user can only read their own sessions
  if (verifiedEmail.toLowerCase() !== requestedEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  try {
    const snap = await db
      .collection("interview_sessions")
      .where("userEmail", "==", requestedEmail)
      .limit(50)
      .get();

    const sessions = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id:            d.id,
          createdAt:     data.createdAt,
          companyName:   data.companyName   || "Unknown",
          role:          data.role          || "Unknown",
          resumeSnippet: data.resumeSnippet || "",
          turns:         data.turns         || [],
          questionCount: data.questionCount || 0,
          durationSecs:  data.durationSecs  || 0,
          // Flatten timestamp so JSON.stringify doesn't lose it
          _createdAtSeconds: data.createdAt?._seconds ?? data.createdAt?.seconds ?? 0,
        };
      })
      // Sort newest-first  -  no composite index needed
      .sort((a, b) => b._createdAtSeconds - a._createdAtSeconds);

    return NextResponse.json({ sessions });
  } catch (err: any) {
    // Exception type only: the message can carry document paths and field data.
    console.error(`[sessions] GET failed type=${err?.name ?? "Error"}`);
    return NextResponse.json(
      { error: "We could not load your interviews just now. Please try again." },
      { status: 500 },
    );
  }
}

// ── POST /api/sessions ───────────────────────────────────────────
// Body: { userEmail, sessionId?, companyName, role, resume, turns, durationSecs }
// If sessionId is provided → update existing doc.
// Otherwise → create new doc and return its ID.
export async function POST(req: Request) {
  const rl = rateLimit(`sessions:post:${clientIp(req)}`, 24, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }
  if (requestTooLarge(req)) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }
  const verifiedEmail = await verifyAuth(req);
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    userEmail, sessionId,
    companyName, role, resume,
    turns, durationSecs,
  } = body;

  if (!userEmail) {
    return NextResponse.json({ error: "Missing userEmail" }, { status: 400 });
  }

  // Enforce: the authenticated user can only write their own sessions
  if (verifiedEmail.toLowerCase() !== userEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeTurns = sanitizeTurns(turns);
  if (!safeTurns) {
    return NextResponse.json({ error: "Invalid session turns" }, { status: 400 });
  }
  if (sessionId != null && (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId))) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const safeCompanyName = safeText(companyName, MAX_SESSION_TEXT_CHARS, "Unknown");
  const safeRole = safeText(role, MAX_SESSION_TEXT_CHARS, "Unknown");
  const safeResume = safeText(resume, 30_000, "");
  const safeDuration = typeof durationSecs === "number" && Number.isFinite(durationSecs)
    ? Math.max(0, Math.min(Math.floor(durationSecs), 86_400))
    : 0;
  if (safeCompanyName == null || safeRole == null || safeResume == null) {
    return NextResponse.json({ error: "Invalid session fields" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const questionCount = safeTurns.filter((turn) => turn.role === "interviewer").length;
  const resumeSnippet = safeResume.slice(0, 300);

  try {
    if (sessionId) {
      // ── Update existing session  -  verify ownership first ──
      const existingDoc = await db.collection("interview_sessions").doc(sessionId).get();
      if (!existingDoc.exists) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      const existingOwner = (existingDoc.data()?.userEmail ?? "").toLowerCase();
      if (existingOwner !== verifiedEmail.toLowerCase()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.collection("interview_sessions").doc(sessionId).update({
        turns: safeTurns,
        questionCount,
        durationSecs:  safeDuration,
        updatedAt:     FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, sessionId });

    } else {
      // ── Create new session ──
      const docRef = await db.collection("interview_sessions").add({
        userEmail,
        companyName:   safeCompanyName,
        role:          safeRole,
        resumeSnippet,
        turns: safeTurns,
        questionCount,
        durationSecs:  safeDuration,
        createdAt:     FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, sessionId: docRef.id });
    }
  } catch (err: any) {
    console.error(`[sessions] POST failed type=${err?.name ?? "Error"}`);
    return NextResponse.json(
      { error: "We could not save this interview just now. It is still on your device." },
      { status: 500 },
    );
  }
}
