import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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

export async function POST(req: Request) {
  if (!initializeAdmin()) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 12_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  try {
    const { idToken } = await req.json();
    if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 8_000) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
    }

    await getAuth().verifyIdToken(idToken, true);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("replysis_session", idToken, cookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("replysis_session", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
