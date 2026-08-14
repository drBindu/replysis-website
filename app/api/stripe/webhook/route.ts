// frontend/app/api/stripe/webhook/route.ts
// ═══════════════════════════════════════════════════════════════
// Stripe Webhook  -  verifies signature then updates Firestore
//
// Setup in Stripe Dashboard:
// 1. Go to dashboard.stripe.com → Developers → Webhooks
// 2. Add endpoint: https://yoursite.com/api/stripe/webhook
// 3. Select events: checkout.session.completed,
//                   customer.subscription.deleted,
//                   customer.subscription.updated,
//                   invoice.paid, invoice.payment_failed
// 4. Copy webhook signing secret → add to .env as STRIPE_WEBHOOK_SECRET
// ═══════════════════════════════════════════════════════════════

import { NextResponse }  from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import crypto            from "node:crypto";
import { PLAN_MONTHLY_CREDITS } from "../../../../data/productFacts";

const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY    || "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// ── Firebase Admin init ──────────────────────────────────────────
if (!getApps().length) {
  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyInput) {
    try {
      let formattedKey = privateKeyInput;
      if (!formattedKey.startsWith("---"))
        formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: formattedKey }),
      });
    } catch (e) {
      console.error("[webhook] Firebase Admin init error:", e);
    }
  }
}

const db = getApps().length ? getFirestore() : null;

// ── Plan credit amounts (monthly caps; refill via lazy reset) ─────
// Must match PLAN_MONTHLY_CREDITS in app/api/stt/tokens/route.ts and
// PLAN_CONFIG in app/lib/credits.ts.
const PLAN_CREDITS: Record<string, number> = {
  pro:      PLAN_MONTHLY_CREDITS.pro,
  max:      PLAN_MONTHLY_CREDITS.max,
  // Retired plans, no longer sold. Kept so a renewal on an existing
  // subscription still refills at the cap that customer signed up for.
  lifetime: PLAN_MONTHLY_CREDITS.lifetime,
  teams:    PLAN_MONTHLY_CREDITS.teams,
};

const PLAN_BY_PRICE_ID = new Map<string, "pro" | "max">(
  [
    [process.env.STRIPE_PRO_MONTHLY_PRICE, "pro"],
    [process.env.STRIPE_PRO_ANNUAL_PRICE, "pro"],
    [process.env.STRIPE_MAX_MONTHLY_PRICE, "max"],
    [process.env.STRIPE_MAX_ANNUAL_PRICE, "max"],
  ].filter((entry): entry is [string, "pro" | "max"] => Boolean(entry[0])),
);

function subscriptionPlan(subscription: any): string | null {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  const fromPrice = typeof priceId === "string" ? PLAN_BY_PRICE_ID.get(priceId) : undefined;
  if (fromPrice) return fromPrice;
  const fromMetadata = subscription?.metadata?.plan;
  return typeof fromMetadata === "string" && ["pro", "max", "teams"].includes(fromMetadata)
    ? fromMetadata
    : null;
}

function subscriptionPeriodEnd(subscription: any): number | null {
  if (typeof subscription?.current_period_end === "number") return subscription.current_period_end;
  const itemEnds = Array.isArray(subscription?.items?.data)
    ? subscription.items.data.map((item: any) => item?.current_period_end).filter((value: unknown) => typeof value === "number")
    : [];
  return itemEnds.length ? Math.max(...itemEnds) : null;
}

function subscriptionInterval(subscription: any): string | null {
  const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
  return interval === "month" ? "monthly" : interval === "year" ? "annual" : null;
}

// ── Stripe signature verification ───────────────────────────────
// Implements https://stripe.com/docs/webhooks/signatures manually
// using HMAC-SHA256  -  no Stripe SDK needed.
function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): boolean {
  if (!secret || !sigHeader) return false;
  try {
    // sigHeader format: "t=<timestamp>,v1=<hmac>,v1=<hmac2>,...". Stripe
    // can send multiple v1 values during secret rotation, so test every one.
    let timestamp = "";
    const signatures: string[] = [];
    for (const part of sigHeader.split(",")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const key = part.slice(0, eq);
      const value = part.slice(eq + 1);
      if (key === "t") timestamp = value;
      if (key === "v1") signatures.push(value);
    }
    if (!timestamp || signatures.length === 0) return false;

    // Reject events older than 5 minutes (replay attack protection)
    const diff = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (diff > 300) {
      console.warn("[webhook] Rejected: event timestamp too old:", diff, "seconds");
      return false;
    }

    const payload  = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const expBuf = Buffer.from(expected, "hex");
    return signatures.some((signature) => {
      if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
      const actual = Buffer.from(signature, "hex");
      return actual.length === expBuf.length && crypto.timingSafeEqual(expBuf, actual);
    });
  } catch (e) {
    console.error("[webhook] Signature verification error:", e);
    return false;
  }
}

function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Stripe API versions from 2025-03-31.basil onward moved an invoice's
// subscription reference from invoice.subscription to
// invoice.parent.subscription_details.subscription. Keep the legacy fallback
// so test events and older pinned webhook versions continue to work too.
function getInvoiceSubscriptionId(invoice: any): string | null {
  const subscription = invoice?.parent?.subscription_details?.subscription
    ?? invoice?.subscription;
  if (typeof subscription === "string") return subscription;
  if (subscription && typeof subscription.id === "string") return subscription.id;
  return null;
}

const EVENT_COLLECTION = "stripe_webhook_events";
const EVENT_LEASE_MS = 10 * 60 * 1000;

async function claimEvent(eventId: string, eventType: string): Promise<"claimed" | "completed" | "processing"> {
  const eventRef = db!.collection(EVENT_COLLECTION).doc(eventId);
  const now = Date.now();

  return db!.runTransaction(async (transaction) => {
    const current = await transaction.get(eventRef);
    const data = current.data();
    if (data?.status === "completed") return "completed";
    if (data?.status === "processing" && Number(data.claimedAtMs ?? 0) + EVENT_LEASE_MS > now) {
      return "processing";
    }

    transaction.set(eventRef, {
      eventType,
      status: "processing",
      claimedAtMs: now,
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return "claimed";
  });
}

async function completeEvent(eventId: string) {
  await db!.collection(EVENT_COLLECTION).doc(eventId).set({
    status: "completed",
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function failEvent(eventId: string) {
  await db!.collection(EVENT_COLLECTION).doc(eventId).set({
    status: "failed",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function applyUserUpdate(uid: string, eventCreated: number, updates: Record<string, unknown>) {
  const userRef = db!.collection("users").doc(uid);
  await db!.runTransaction(async (transaction) => {
    const current = await transaction.get(userRef);
    const lastEventCreated = Number(current.data()?.stripeLastEventCreated ?? 0);
    if (lastEventCreated > eventCreated) return;

    const nextUpdates = { ...updates };
    if (typeof updates.credits === "number") {
      nextUpdates.credits = updates.credits + Math.max(0, Number(current.data()?.purchasedCredits ?? 0));
    }
    transaction.set(userRef, {
      ...nextUpdates,
      stripeLastEventCreated: eventCreated,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function applyActiveSubscription(uid: string, eventCreated: number, plan: string, subscription: any) {
  const userRef = db!.collection("users").doc(uid);
  await db!.runTransaction(async (transaction) => {
    const current = await transaction.get(userRef);
    const currentData = current.data() ?? {};
    const lastEventCreated = Number(currentData.stripeLastEventCreated ?? 0);
    if (lastEventCreated > eventCreated) return;

    const previousPlan = typeof currentData.plan === "string" && currentData.plan in PLAN_MONTHLY_CREDITS
      ? currentData.plan
      : "free";
    const previousCap = PLAN_MONTHLY_CREDITS[previousPlan as keyof typeof PLAN_MONTHLY_CREDITS] ?? PLAN_MONTHLY_CREDITS.free;
    const nextCap = PLAN_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
    const purchasedCredits = Math.max(0, Number(currentData.purchasedCredits ?? 0));
    const currentCredits = Math.max(0, Number(currentData.credits ?? 0) - purchasedCredits);
    const adjustedCredits = plan === previousPlan
      ? Math.min(currentCredits, nextCap)
      : nextCap > previousCap
        ? Math.min(nextCap, currentCredits + (nextCap - previousCap))
        : Math.min(currentCredits, nextCap);

    transaction.set(userRef, {
      plan,
      credits: adjustedCredits + purchasedCredits,
      stripeCustomerId: subscription.customer ?? currentData.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription.id ?? currentData.stripeSubscriptionId ?? null,
      stripeSubscriptionStatus: subscription.status ?? "active",
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      stripeCurrentPeriodEnd: subscriptionPeriodEnd(subscription),
      stripeBillingInterval: subscriptionInterval(subscription) ?? currentData.stripeBillingInterval ?? null,
      stripeLastEventCreated: eventCreated,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

// ── POST /api/stripe/webhook ─────────────────────────────────────
export async function POST(req: Request) {
  // Must read raw body BEFORE any JSON parsing  -  Stripe verifies against raw bytes
  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  // Reject if secret not configured in env
  if (!WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set  -  rejecting all events");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify signature  -  reject anything that doesn't match
  if (!verifyStripeSignature(rawBody, sigHeader, WEBHOOK_SECRET)) {
    console.warn("[webhook] Signature verification FAILED  -  possible replay or forgery");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!db) {
    console.error("[webhook] Firebase Admin not initialized");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (typeof event.id !== "string" || event.id.length === 0 || event.id.length > 255 || typeof event.type !== "string") {
    return NextResponse.json({ error: "Invalid Stripe event" }, { status: 400 });
  }
  if (event.type === "invoice.paid" && !STRIPE_SECRET) {
    console.error("[webhook] STRIPE_SECRET_KEY is required to process invoice.paid");
    return NextResponse.json({ error: "Billing service not configured" }, { status: 503 });
  }

  const claim = await claimEvent(event.id, event.type);
  if (claim === "completed") return NextResponse.json({ received: true, duplicate: true });
  if (claim === "processing") {
    // Tell Stripe to retry later. Returning 2xx here could permanently lose an
    // event if a prior worker crashed while it held the lease.
    return NextResponse.json({ error: "Event is already being processed" }, { status: 503 });
  }

  const eventCreated = typeof event.created === "number" && Number.isFinite(event.created)
    ? event.created
    : Math.floor(Date.now() / 1000);

  try {
    // ── CHECKOUT COMPLETED  -  user just paid ──────────────────────
    if (event.type === "checkout.session.completed") {
      const session      = event.data.object;
      const uid          = session.metadata?.uid;
      const plan         = session.metadata?.plan;
      const customerId   = session.customer;
      const subscriptionId = session.subscription;

      if (uid && session.metadata?.purchaseType === "credit_pack") {
        const purchased = Number(session.metadata?.credits);
        if (![500, 1500, 5000].includes(purchased)) throw new Error("Invalid credit pack metadata");
        const userRef = db.collection("users").doc(uid);
        await db.runTransaction(async transaction => {
          const current = await transaction.get(userRef);
          if (!current.exists) throw new Error("Credit purchaser not found");
          transaction.set(userRef, {
            credits: FieldValue.increment(purchased),
            purchasedCredits: FieldValue.increment(purchased),
            creditPurchasesCount: FieldValue.increment(1),
            stripeCustomerId: customerId ?? current.data()?.stripeCustomerId ?? null,
            lastCreditPurchaseAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        });
        console.log(`CREDIT PACK: ${uid} +${purchased}`);
      } else if (uid && plan && ["pro", "max", "lifetime", "teams"].includes(plan)) {
        console.log(`✅ PAYMENT: ${uid} → ${plan} | Customer: ${customerId}`);
        const credits = PLAN_CREDITS[plan] ?? 1000;
        await applyUserUpdate(uid, eventCreated, {
          plan,
          credits,
          creditsUsed: 0,
          creditsResetDate: getNextResetDate(),
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId ?? null,
          stripeSubscriptionStatus: "active",
          stripeCancelAtPeriodEnd: false,
          stripeBillingInterval: session.metadata?.interval ?? null,
          lastPaymentFailedAt: null,
        });
      } else {
        console.error("[webhook] Missing or invalid checkout metadata");
      }
    }

    // ── SUBSCRIPTION CANCELED  -  revert to free ───────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const uid          = subscription.metadata?.uid;

      if (uid) {
        console.log(`⚠️ CANCELED: ${uid}`);
        await applyUserUpdate(uid, eventCreated, {
          plan:                 "free",
          credits:              PLAN_MONTHLY_CREDITS.free,
          creditsResetDate:     getNextResetDate(),
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: "canceled",
          stripeCancelAtPeriodEnd: false,
          stripeCurrentPeriodEnd: null,
        });
      }
    }

    // ── INVOICE PAID  -  monthly credit renewal ────────────────────
    if (event.type === "invoice.paid") {
      const invoice        = event.data.object;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          { headers: { Authorization: `Bearer ${STRIPE_SECRET}` } }
        );
        if (!subRes.ok) throw new Error(`Stripe subscription lookup failed: ${subRes.status}`);
        const sub = await subRes.json();
        const uid  = sub.metadata?.uid;
        const plan = subscriptionPlan(sub);

        if (uid && plan && ["pro", "max", "teams"].includes(plan)) { // lifetime is one-time, no renewal
          const credits = PLAN_CREDITS[plan] ?? 1000;
          await applyUserUpdate(uid, eventCreated, {
            plan,
            credits,
            creditsUsed:      0,
            creditsResetDate: getNextResetDate(),
            stripeCustomerId: sub.customer ?? null,
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: sub.status ?? "active",
            stripeCancelAtPeriodEnd: sub.cancel_at_period_end === true,
            stripeCurrentPeriodEnd: subscriptionPeriodEnd(sub),
            stripeBillingInterval: subscriptionInterval(sub),
            lastPaymentFailedAt: null,
          });
          console.log(`🔄 RENEWED: ${uid} → ${credits} credits`);
        }
      }
    }

    // ── SUBSCRIPTION UPDATED  -  sync portal plan/status changes ─────────────
    // The Stripe portal can change Pro ↔ Max or monthly ↔ annual. Resolve the
    // plan from the actual price ID rather than stale Checkout metadata.
    if (event.type === "customer.subscription.updated") {
      const sub  = event.data.object;
      const uid  = sub.metadata?.uid;
      const plan = subscriptionPlan(sub);
      const dead = ["canceled", "unpaid", "incomplete_expired"];
      if (uid && dead.includes(sub.status)) {
        console.log(`⚠️ SUBSCRIPTION ${String(sub.status).toUpperCase()}: ${uid} → free`);
        await applyUserUpdate(uid, eventCreated, {
          plan:                 "free",
          credits:              PLAN_MONTHLY_CREDITS.free,
          creditsResetDate:     getNextResetDate(),
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: sub.status,
          stripeCancelAtPeriodEnd: false,
          stripeCurrentPeriodEnd: null,
        });
      } else if (uid && plan && ["pro", "max", "teams"].includes(plan)) {
        await applyActiveSubscription(uid, eventCreated, plan, sub);
        console.log(`🔁 SUBSCRIPTION UPDATED: ${uid} → ${plan} (${String(sub.status)})`);
      }
    }

    // ── PAYMENT FAILED  -  record only, do NOT downgrade ──────────────
    // Stripe automatically retries failed renewals; only if it ultimately
    // gives up does subscription.deleted/updated fire (handled above). So we
    // keep the user active through the retry window and just record the
    // failure timestamp so it's visible (admin/support).
    if (event.type === "invoice.payment_failed" && STRIPE_SECRET) {
      const invoice        = event.data.object;
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        try {
          const subRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
            { headers: { Authorization: `Bearer ${STRIPE_SECRET}` } }
          );
          if (!subRes.ok) throw new Error(`Stripe subscription lookup failed: ${subRes.status}`);
          const sub = await subRes.json();
          const uid = sub.metadata?.uid;
          if (uid) {
            console.warn(`⚠️ PAYMENT FAILED (renewal): ${uid} — Stripe will retry`);
            await applyUserUpdate(uid, eventCreated, {
              lastPaymentFailedAt: new Date().toISOString(),
              stripeSubscriptionStatus: sub.status ?? "past_due",
            });
          }
        } catch (e) {
          console.error("[webhook] payment_failed lookup error:", e);
        }
      }
    }

    await completeEvent(event.id);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] Handler error:", err);
    await failEvent(event.id);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
