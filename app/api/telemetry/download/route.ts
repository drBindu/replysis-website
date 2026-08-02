import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { clientIp, rateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 1024;

function initializeAdmin() {
  if (getApps().length) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return false;

  try {
    let privateKey = privateKeyInput;
    if (!privateKey.startsWith("---")) privateKey = Buffer.from(privateKey, "base64").toString("utf8");
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return true;
  } catch (error) {
    console.error("[download-telemetry] Firebase Admin initialization failed", error);
    return false;
  }
}

function isAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://verchor.com";
  return origin === siteUrl || (process.env.NODE_ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(origin));
}

async function verifiedUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  try {
    return (await getAuth().verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const limit = rateLimit(`download:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  if (!initializeAdmin()) return NextResponse.json({ error: "Telemetry unavailable" }, { status: 503 });

  try {
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }

    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }

    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { os } = body as { os?: unknown };
    if (os !== "win" && os !== "mac") return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

    const db = getFirestore();
    const userId = await verifiedUserId(req);
    const downloadRef = db.collection("app_downloads").doc();
    const batch = db.batch();
    batch.set(downloadRef, {
      os,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const user = await userRef.get();
      if (user.exists) {
        batch.update(userRef, {
          appDownloads: FieldValue.arrayUnion({ os, at: new Date().toISOString() }),
        });
      }
    }

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
