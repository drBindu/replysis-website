import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { clientIp, rateLimit } from "../../lib/rate-limit";

function getDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKeyInput) return null;
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  }
  return getFirestore();
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max)
    : "";
}

export async function GET(req: Request) {
  const rl = rateLimit(`reviews:get:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const db = getDb();
  if (!db) return NextResponse.json({ reviews: [] });

  const snapshot = await db.collection("product_reviews")
    .where("status", "==", "approved")
    .limit(20)
    .get();
  const reviews = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      rating: data.rating,
      title: data.title,
      body: data.body,
      role: data.role,
      platform: data.platform,
      displayName: data.displayName || "Verified customer",
      verifiedPurchase: data.verifiedPurchase === true,
      createdAtSeconds: data.createdAt?._seconds ?? data.createdAt?.seconds ?? 0,
    };
  }).sort((a, b) => b.createdAtSeconds - a.createdAtSeconds);
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const rl = rateLimit(`reviews:post:${clientIp(req)}`, 3, 24 * 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Review limit reached" }, { status: 429 });
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const db = getDb();
  if (!db || !token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let decoded;
  try { decoded = await getAuth().verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Sign in required" }, { status: 401 }); }

  const profile = await db.collection("users").doc(decoded.uid).get();
  const profileData = profile.data() ?? {};
  const verifiedPurchase = profileData.plan !== "free" && Boolean(profileData.plan)
    || Boolean(profileData.stripeCustomerId)
    || Number(profileData.creditPurchasesCount ?? 0) > 0;
  if (!verifiedPurchase) {
    return NextResponse.json({ error: "Only verified customers can submit a product review" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);
  const title = clean(body?.title, 90);
  const reviewBody = clean(body?.body, 900);
  const role = clean(body?.role, 80);
  const platform = clean(body?.platform, 30);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || title.length < 4 || reviewBody.length < 20) {
    return NextResponse.json({ error: "Complete the rating, title, and review" }, { status: 400 });
  }

  const existing = await db.collection("product_reviews").where("uid", "==", decoded.uid).limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "You already submitted a review" }, { status: 409 });

  await db.collection("product_reviews").add({
    uid: decoded.uid,
    rating,
    title,
    body: reviewBody,
    role,
    platform: ["Web", "Windows", "macOS"].includes(platform) ? platform : "Web",
    displayName: clean(decoded.name, 50) || "Verified customer",
    verifiedPurchase: true,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ success: true, message: "Review received and queued for moderation" });
}
