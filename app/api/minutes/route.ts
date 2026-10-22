// Interview minutes (India): the balance, the auto add switch, and the auto add charge itself.
//
// GET                      -> { minutesBalance, autoAdd, savedCard }
// POST { autoAdd: bool }   -> switches auto add on or off (on needs a card saved by an earlier purchase)
// POST { action: "add" }   -> auto add: when 2 minutes or fewer are left, charges the saved card for
//                             15 more minutes. If the bank wants the person to approve it (most Indian
//                             cards do, under RBI rules), answers { needsApproval, url } with a checkout
//                             for the same 15 minutes instead, so one tap finishes it.

import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../lib/rate-limit";
import { AUTO_ADD_MINUTES, AUTO_ADD_WHEN_LEFT, rupeesFor } from "../../../data/interviewMinutes";

export const dynamic = "force-dynamic";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
/** One auto add at a time: a second request inside this window is refused rather than charged. */
const ADD_LOCK_MS = 3 * 60 * 1000;

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
    console.error("[minutes] Firebase Admin init error:", (e as Error)?.name ?? "Error");
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

function status(data: Record<string, unknown>) {
  return {
    minutesBalance: Math.max(0, Number(data.minutesBalance ?? 0)),
    autoAdd: data.minutesAutoAdd === true,
    savedCard: typeof data.minutesPaymentMethod === "string" && data.minutesPaymentMethod.length > 0,
  };
}

export async function GET(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await getFirestore().collection("users").doc(uid).get();
  return NextResponse.json(status(snap.data() ?? {}), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const rl = rateLimit(`minutes:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userRef = getFirestore().collection("users").doc(uid);

  if (typeof body.autoAdd === "boolean") {
    const snap = await userRef.get();
    const current = status(snap.data() ?? {});
    if (body.autoAdd && !current.savedCard) {
      return NextResponse.json({ ...current, needsCard: true });
    }
    await userRef.set({ minutesAutoAdd: body.autoAdd, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ...current, autoAdd: body.autoAdd });
  }

  if (body.action === "add") return autoAdd(uid, userRef, req);
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

async function autoAdd(uid: string, userRef: FirebaseFirestore.DocumentReference, req: Request) {
  if (!STRIPE_SECRET) return NextResponse.json({ error: "Billing unavailable" }, { status: 503 });

  // Claim the add inside a transaction: only when it is switched on, a card is saved, the balance is
  // nearly gone, and no other add started in the last three minutes. Two app windows cannot both charge.
  const now = Date.now();
  const claim = await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() ?? {};
    const s = status(data);
    if (!s.autoAdd || !s.savedCard) return { ok: false as const, reason: "off", s };
    if (s.minutesBalance > AUTO_ADD_WHEN_LEFT) return { ok: false as const, reason: "not-needed", s };
    // A paid plan with answers left keeps answering without minutes: never charge for minutes then (2026-10-22).
    const paidPlan = data.plan === "pro" || data.plan === "max" || data.plan === "teams" || data.plan === "lifetime";
    if (paidPlan && Number(data.credits ?? 0) >= 20) return { ok: false as const, reason: "plan-covers", s };
    if (now - Number(data.minutesAddStartedAt ?? 0) < ADD_LOCK_MS) return { ok: false as const, reason: "in-progress", s };
    tx.update(userRef, { minutesAddStartedAt: now });
    return { ok: true as const, s, customer: String(data.stripeCustomerId ?? ""), method: String(data.minutesPaymentMethod) };
  });
  if (!claim.ok) return NextResponse.json({ ...claim.s, added: 0, reason: claim.reason });

  const amount = rupeesFor(AUTO_ADD_MINUTES) * 100;
  const params = new URLSearchParams();
  params.append("amount", String(amount));
  params.append("currency", "inr");
  params.append("customer", claim.customer);
  params.append("payment_method", claim.method);
  params.append("off_session", "true");
  params.append("confirm", "true");
  params.append("description", `Replysis interview minutes: auto add ${AUTO_ADD_MINUTES} minutes`);
  params.append("metadata[uid]", uid);
  params.append("metadata[purchaseType]", "minutes_auto_add");
  params.append("metadata[minutes]", String(AUTO_ADD_MINUTES));

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `minutes-add-${uid}-${now}`,
    },
    body: params.toString(),
  });
  const pi = await res.json().catch(() => ({}));

  if (res.ok && pi.status === "succeeded") {
    await getFirestore().runTransaction(async (tx) => {
      const receiptRef = getFirestore().collection("minute_purchases").doc(String(pi.id));
      if ((await tx.get(receiptRef)).exists) return;
      tx.set(receiptRef, { uid, minutes: AUTO_ADD_MINUTES, amount, currency: "inr", auto: true,
                           createdAt: FieldValue.serverTimestamp() });
      tx.update(userRef, {
        minutesBalance: FieldValue.increment(AUTO_ADD_MINUTES),
        minutesBought: FieldValue.increment(AUTO_ADD_MINUTES),
        lastMinutesPurchaseAt: FieldValue.serverTimestamp(),
        minutesAddStartedAt: 0,
      });
    });
    console.log(`MINUTES AUTO ADD: ${uid} +${AUTO_ADD_MINUTES}`);
    return NextResponse.json({ ...claim.s, minutesBalance: claim.s.minutesBalance + AUTO_ADD_MINUTES, added: AUTO_ADD_MINUTES });
  }

  // The bank wants the person to approve it. Hand back a checkout for the same 15 minutes: one tap.
  const code = pi?.error?.code ?? pi?.last_payment_error?.code ?? pi?.status ?? "failed";
  console.log(`[minutes] auto add needs the person: ${code}`);
  await userRef.update({ minutesAddStartedAt: 0 });
  const url = await approvalCheckout(uid, claim.customer, req);
  return NextResponse.json({ ...claim.s, added: 0, needsApproval: true, url });
}

async function approvalCheckout(uid: string, customer: string, req: Request): Promise<string | null> {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://replysis.com";
  const origin = req.headers.get("origin") === "http://localhost:3000" ? "http://localhost:3000" : SITE_URL;
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("line_items[0][price_data][currency]", "inr");
  params.append("line_items[0][price_data][unit_amount]", String(rupeesFor(AUTO_ADD_MINUTES) * 100));
  params.append("line_items[0][price_data][product_data][name]", `Replysis interview minutes: ${AUTO_ADD_MINUTES} minutes`);
  params.append("line_items[0][quantity]", "1");
  params.append("success_url", `${origin}/account?minutes=added`);
  params.append("cancel_url", `${origin}/account`);
  if (customer.startsWith("cus_")) params.append("customer", customer);
  params.append("payment_intent_data[setup_future_usage]", "off_session");
  params.append("submit_type", "pay");
  params.append("metadata[uid]", uid);
  params.append("metadata[purchaseType]", "minutes");
  params.append("metadata[minutes]", String(AUTO_ADD_MINUTES));
  params.append("metadata[autoAdd]", "1");
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_SECRET}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const session = await res.json().catch(() => ({}));
  return typeof session.url === "string" ? session.url : null;
}
