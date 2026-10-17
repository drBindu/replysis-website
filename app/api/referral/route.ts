// Referral links.
//
// GET   -> { code, link, rewarded, max }       this person's own code (made on first use) and how many friends were rewarded
// POST  { code } -> { rewarded: boolean }      a NEW account claims a friend's code; both sides get free answers, once

import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../lib/rate-limit";
import {
  REFERRAL_ALPHABET, REFERRAL_CODE_LENGTH, REFERRAL_MAX_REWARDS, REFERRAL_NEW_ACCOUNT_HOURS,
  REFERRAL_REWARD_CREDITS, isReferralCode,
} from "../../../data/referrals";

export const dynamic = "force-dynamic";

function ensureAdminInit() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return;
  try {
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  } catch (e) {
    console.error("[referral] Firebase Admin init error:", (e as Error)?.name ?? "Error");
  }
}

async function verifiedUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  ensureAdminInit();
  if (!getApps().length) return null;
  try { return (await getAuth().verifyIdToken(token)).uid; } catch { return null; }
}

function newCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) code += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  return code;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://replysis.com";

export async function GET(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getFirestore();
  const ref = db.collection("users").doc(uid);

  let snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Profile not ready" }, { status: 404 });
  let code = snap.data()?.refCode;

  if (!isReferralCode(code)) {
    // A code is made once and kept. A collision is checked for, not assumed away.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = newCode();
      const taken = await db.collection("users").where("refCode", "==", candidate).limit(1).get();
      if (!taken.empty) continue;
      await ref.set({ refCode: candidate }, { merge: true });
      code = candidate;
      break;
    }
    if (!isReferralCode(code)) return NextResponse.json({ error: "Try again" }, { status: 503 });
    snap = await ref.get();
  }

  return NextResponse.json({
    code,
    link: `${SITE_URL}/?ref=${code}`,
    rewarded: Math.max(0, Number(snap.data()?.referralRewards ?? 0)),
    max: REFERRAL_MAX_REWARDS,
    rewardAnswers: Math.floor(REFERRAL_REWARD_CREDITS / 5),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const rl = rateLimit(`referral:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !isReferralCode(body.code)) return NextResponse.json({ rewarded: false, reason: "invalid" });

  const db = getFirestore();
  const found = await db.collection("users").where("refCode", "==", body.code).limit(1).get();
  if (found.empty) return NextResponse.json({ rewarded: false, reason: "unknown" });
  const referrerRef = found.docs[0].ref;
  if (referrerRef.id === uid) return NextResponse.json({ rewarded: false, reason: "self" });

  const meRef = db.collection("users").doc(uid);
  const claimRef = db.collection("referral_claims").doc(uid);   // one claim per new account, ever

  const result = await db.runTransaction(async (tx) => {
    const [me, referrer, claim] = await Promise.all([tx.get(meRef), tx.get(referrerRef), tx.get(claimRef)]);
    if (claim.exists) return "already";
    if (!me.exists) return "no-profile";
    const created = me.data()?.createdAt?.toMillis?.() ?? 0;
    if (!created || Date.now() - created > REFERRAL_NEW_ACCOUNT_HOURS * 3_600_000) return "not-new";
    if (Number(referrer.data()?.referralRewards ?? 0) >= REFERRAL_MAX_REWARDS) {
      tx.set(claimRef, { referrer: referrerRef.id, rewarded: false, reason: "cap", createdAt: FieldValue.serverTimestamp() });
      return "cap";
    }
    // Added the way a bought pack is, so the monthly refill does not take it back.
    const reward = {
      credits: FieldValue.increment(REFERRAL_REWARD_CREDITS),
      purchasedCredits: FieldValue.increment(REFERRAL_REWARD_CREDITS),
    };
    tx.update(meRef, { ...reward, referredBy: referrerRef.id, updatedAt: FieldValue.serverTimestamp() });
    tx.update(referrerRef, { ...reward, referralRewards: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    tx.set(claimRef, { referrer: referrerRef.id, rewarded: true, credits: REFERRAL_REWARD_CREDITS, createdAt: FieldValue.serverTimestamp() });
    return "rewarded";
  });

  if (result === "rewarded") console.log(`REFERRAL: ${uid} joined through ${found.docs[0].id}, +${REFERRAL_REWARD_CREDITS} credits each`);
  return NextResponse.json({ rewarded: result === "rewarded", reason: result });
}
