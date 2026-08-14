import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { PLAN_MONTHLY_CREDITS } from "../../../../data/productFacts";

export const runtime = "nodejs";

function initializeAdmin() {
  if (getApps().length) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return false;

  try {
    let privateKey = privateKeyInput;
    if (!privateKey.startsWith("---")) {
      privateKey = Buffer.from(privateKey, "base64").toString("utf8");
    }
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return true;
  } catch (error) {
    console.error("[auth-session] Firebase Admin initialization failed", error);
    return false;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60,
};

function nextResetDate(): string {
  const reset = new Date();
  reset.setMonth(reset.getMonth() + 1);
  reset.setDate(1);
  reset.setHours(0, 0, 0, 0);
  return reset.toISOString();
}

async function ensureUserProfile(uid: string, email: string, displayName: string) {
  const db = getFirestore();
  const ref = db.collection("users").doc(uid);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      transaction.update(ref, { lastLogin: FieldValue.serverTimestamp() });
      return;
    }

    transaction.create(ref, {
      uid,
      email,
      displayName: displayName || "User",
      plan: "free",
      credits: PLAN_MONTHLY_CREDITS.free,
      creditsUsed: 0,
      purchasedCredits: 0,
      creditsResetDate: nextResetDate(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      stripeCancelAtPeriodEnd: false,
      stripeCurrentPeriodEnd: null,
      stripeBillingInterval: null,
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: FieldValue.serverTimestamp(),
    });
  });
}

export async function POST(req: Request) {
  if (!initializeAdmin()) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 12_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let idToken: string;
  try {
    const body = await req.json();
    idToken = body?.idToken;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 8_000) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  try {
    await ensureUserProfile(
      decodedToken.uid,
      typeof decodedToken.email === "string" ? decodedToken.email : "",
      typeof decodedToken.name === "string" ? decodedToken.name : "User",
    );
  } catch (error) {
    console.error("[auth-session] User profile initialization failed", (error as Error)?.name ?? "Error");
    return NextResponse.json({ error: "Account setup is temporarily unavailable" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("replysis_session", idToken, cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("replysis_session", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
