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
//                   invoice.paid, invoice.payment_failed,
//                   charge.refunded, charge.dispute.created
// 4. Copy webhook signing secret → add to .env as STRIPE_WEBHOOK_SECRET
// ═══════════════════════════════════════════════════════════════

import { NextResponse }  from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import crypto            from "node:crypto";
import { PLAN_MONTHLY_CREDITS, INDIA_PLAN_ALLOWANCE, nextMonthStartISO as getNextResetDate } from "../../../../data/productFacts";
import { validMinutes } from "../../../../data/interviewMinutes";
import { MAYA_ADDON, MOCK_PLAN } from "../../../../data/mayaAddon";
import { sendOwnerAlert } from "../../../lib/user-mail";
import { practiceActive } from "../../../lib/paid-plan";
import { afterTakingBack, endAfterTakingBackMonth, isFullDispute, isFullRefund, purchaseFromMetadata, subscriptionRefundScope, type Purchase } from "../../../lib/refund-rules";

/** Tells the owner a Maya add-on was bought, so the Simli plan can be raised before it is needed (owner, 2026-10-26). */
const alertMayaBought = (how: string) => sendOwnerAlert(`Maya add-on bought (${how})`, `Someone just bought the mock interview add-on (Maya).\n\nIf Simli is still on the Free plan, upgrade it to Hobby now so Maya can join for them:\nhttps://app.simli.com/billing  (account booms5089@gmail.com)\n\nThe Free plan allows only one live Maya at a time and 50 minutes a month.`);

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
    // The rupee prices are the same two plans. Without these a customer who
    // paid in rupees would land on the free tier, which is the worst possible
    // way to be wrong.
    [process.env.STRIPE_PRO_MONTHLY_PRICE_INR, "pro"],
    [process.env.STRIPE_PRO_ANNUAL_PRICE_INR, "pro"],
    [process.env.STRIPE_MAX_MONTHLY_PRICE_INR, "max"],
    [process.env.STRIPE_MAX_ANNUAL_PRICE_INR, "max"],
  ].filter((entry): entry is [string, "pro" | "max"] => Boolean(entry[0])),
);

/**
 * The Stripe prices that are sold in rupees.
 *
 * A rupee subscription is the same plan at a price set for that market rather
 * than converted - Pro is Rs 699 against $29.99 - and it carries a smaller
 * allowance to match, because listening is the only part of this product that
 * costs real money. Written onto the user here, at the one moment we know
 * which price was actually bought.
 */
const INDIA_PRICE_IDS = new Set(
  [
    process.env.STRIPE_PRO_MONTHLY_PRICE_INR,
    process.env.STRIPE_PRO_ANNUAL_PRICE_INR,
    process.env.STRIPE_MAX_MONTHLY_PRICE_INR,
    process.env.STRIPE_MAX_ANNUAL_PRICE_INR,
  ].filter((id): id is string => Boolean(id)),
);

// The Maya add-on (mock interview with live Maya, 2026-10-26): kept in step with the subscription's items.
const MAYA_PRICE_IDS = new Set(
  [
    process.env.STRIPE_MAYA_MONTHLY_PRICE,
    process.env.STRIPE_MAYA_MONTHLY_PRICE_INR,
    process.env.STRIPE_MAYA_MONTHLY_PRICE_GBP,
    process.env.STRIPE_MAYA_MONTHLY_PRICE_CAD,
    process.env.STRIPE_MAYA_MONTHLY_PRICE_AUD,
  ].filter((id): id is string => Boolean(id)),
);

/** Whether the subscription carries the Maya add-on, and how many interviews a month that gives. */
function mayaFields(subscription: any): { mayaAddon: boolean; mayaMonthly: number } {
  const items: any[] = Array.isArray(subscription?.items?.data) ? subscription.items.data : [];
  const item = items.find((it) => MAYA_PRICE_IDS.has(it?.price?.id));
  const rupees = String(item?.price?.currency ?? "").toLowerCase() === "inr";
  return { mayaAddon: Boolean(item), mayaMonthly: rupees ? MAYA_ADDON.interviewsIndia : MAYA_ADDON.interviews };
}

function boughtInRupees(subscription: any): boolean {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  return typeof priceId === "string" && INDIA_PRICE_IDS.has(priceId);
}

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

/** A month's answers for this plan: a rupee subscription carries its own, smaller number. */
function monthCredits(plan: string, rupees: boolean): number {
  const india = rupees ? INDIA_PLAN_ALLOWANCE[plan as keyof typeof INDIA_PLAN_ALLOWANCE] : undefined;
  return india?.credits ?? PLAN_CREDITS[plan] ?? 1000;
}

/**
 * When a subscription's lazy refill may run. Stripe refills a monthly plan at each renewal, so the date sits just past
 * the renewal: on the 1st of the month it gave every subscriber a second refill. Annual plans are refilled monthly by that
 * lazy reset, so they keep the 1st.
 */
function subscriptionResetDate(interval: unknown, periodEnd: number | null): string {
  if (interval === "annual") return getNextResetDate();
  const end = periodEnd ? periodEnd * 1000 : Date.now() + 31 * 86_400_000;
  // Three days past the renewal, not one: the renewal's own invoice.paid refills the month, and an Indian card mandate
  // charges a day or more late. A day's slack let the lazy reset hand out a fresh month before the money came.
  return new Date(end + RENEWAL_SLACK_MS).toISOString();
}

const RENEWAL_SLACK_MS = 3 * 86_400_000;

/** A first Stripe customer sticks: a new id would hide the older subscription and saved card from the billing portal. */
function keptCustomer(stored: unknown, incoming: unknown): unknown {
  return typeof stored === "string" && stored.startsWith("cus_") ? stored : incoming ?? null;
}

/** Whether the running Practice was bought in rupees. mayaMonthly cannot say: a rupee Pro overwrites it. */
function practiceInIndia(d: Record<string, unknown>): boolean {
  if (typeof d.mockIndia === "boolean") return d.mockIndia;
  // Bought before mockIndia was stored: an India month paid once is the only Practice without a subscription.
  return d.mockPlan !== true && typeof d.mockPlanUntil === "string";
}

/**
 * The account's numbers once its Pro or Max has gone: Practice carries on if it is running. The month's counters start
 * again: left at the Pro or Max total, every answer was taken from bought packs instead of the Practice month.
 */
function afterSubscription(d: Record<string, unknown>): Record<string, unknown> {
  // Bought packs are added on top by applyUserUpdate.
  if (!practiceActive(d)) return { credits: PLAN_MONTHLY_CREDITS.free, creditsUsed: 0, audioMinutesAllowance: FieldValue.delete() };
  const india = practiceInIndia(d);
  return { credits: india ? MOCK_PLAN.creditsIndia : MOCK_PLAN.credits,
           creditsUsed: 0, audioMinutesUsed: 0,
           audioMinutesAllowance: india ? MOCK_PLAN.audioMinutesIndia : MOCK_PLAN.audioMinutes };
}

/**
 * Another live Pro or Max subscription on the same Stripe customer, if there is one. With two, ending the stored one
 * must move the account onto the other, not to free while the other keeps charging.
 */
async function otherLivePlan(customer: unknown, endedId: unknown): Promise<{ plan: string; sub: any } | null> {
  if (typeof customer !== "string" || !customer.startsWith("cus_") || !STRIPE_SECRET) return null;
  const list = (await stripeGet(`subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=20`))?.data ?? [];
  for (const sub of list) {
    if (sub?.id === endedId || sub?.metadata?.kind === "mock") continue;
    if (!["active", "trialing", "past_due"].includes(sub?.status)) continue;
    const plan = subscriptionPlan(sub);
    if (plan && ["pro", "max", "teams"].includes(plan)) return { plan, sub };
  }
  return null;
}

/**
 * A Pro or Max subscription ended (deleted, or updated to a dead status). Only the subscription this account runs on may
 * end it: with two, cancelling the spare must not downgrade anyone, and ending the stored one moves onto the other.
 */
async function endSubscription(uid: string, eventCreated: number, sub: any, status: string) {
  const d = (await db!.collection("users").doc(uid).get()).data() ?? {};
  if (d.stripeSubscriptionId && d.stripeSubscriptionId !== sub.id) return;
  const other = await otherLivePlan(sub.customer, sub.id);
  if (other) {
    console.log(`🔁 SUBSCRIPTION ${status.toUpperCase()} ${sub.id}: ${uid} carries on with ${other.sub.id}`);
    await applyActiveSubscription(uid, eventCreated, other.plan, other.sub);
    return;
  }
  console.log(`⚠️ SUBSCRIPTION ${status.toUpperCase()}: ${uid} → free`);
  await applyUserUpdate(uid, eventCreated, {
    plan:                 "free",
    ...afterSubscription(d),
    creditsResetDate:     getNextResetDate(),
    stripeSubscriptionId: null,
    mayaAddon: false,
    stripeSubscriptionStatus: status,
    stripeCancelAtPeriodEnd: false,
    stripeCurrentPeriodEnd: null,
  });
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
    if ("stripeCustomerId" in updates) nextUpdates.stripeCustomerId = keptCustomer(current.data()?.stripeCustomerId, updates.stripeCustomerId);
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
    // A rupee subscription carries its own, smaller allowance.
    const india = boughtInRupees(subscription);
    const indiaAllowance = india
      ? INDIA_PLAN_ALLOWANCE[plan as keyof typeof INDIA_PLAN_ALLOWANCE]
      : undefined;
    const nextCap = indiaAllowance?.credits ?? PLAN_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
    const purchasedCredits = Math.max(0, Number(currentData.purchasedCredits ?? 0));
    const currentCredits = Math.max(0, Number(currentData.credits ?? 0) - purchasedCredits);
    const adjustedCredits = plan === previousPlan
      ? Math.min(currentCredits, nextCap)
      : nextCap > previousCap
        ? Math.min(nextCap, currentCredits + (nextCap - previousCap))
        : Math.min(currentCredits, nextCap);

    transaction.set(userRef, {
      plan,
      planSource: "subscription",
      credits: adjustedCredits + purchasedCredits,
      // Cleared rather than left behind when the subscription is not a rupee
      // one, so somebody who moves from a rupee plan to a dollar plan is not
      // still capped at the smaller allowance.
      audioMinutesAllowance: indiaAllowance?.audioMinutes ?? FieldValue.delete(),
      stripeCustomerId: keptCustomer(currentData.stripeCustomerId, subscription.customer),
      stripeSubscriptionId: subscription.id ?? currentData.stripeSubscriptionId ?? null,
      stripeSubscriptionStatus: subscription.status ?? "active",
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      stripeCurrentPeriodEnd: subscriptionPeriodEnd(subscription),
      stripeBillingInterval: subscriptionInterval(subscription) ?? currentData.stripeBillingInterval ?? null,
      ...mayaFields(subscription),
      stripeLastEventCreated: eventCreated,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

/**
 * Adds bought interview minutes. Keyed on the checkout session, so a session is never added twice even if
 * both the completed and the settled events arrive. With auto add chosen, the saved card is kept for it.
 */
async function addBoughtMinutes(session: any) {
  const uid = session.metadata?.uid;
  const minutes = validMinutes(Number(session.metadata?.minutes));
  if (typeof uid !== "string" || !uid || minutes === null) throw new Error("Invalid minutes metadata");
  const autoAdd = session.metadata?.autoAdd === "1";

  let paymentMethod: string | null = null;
  if (autoAdd && typeof session.payment_intent === "string" && STRIPE_SECRET) {
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${session.payment_intent}`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET}` } });
    if (res.ok) {
      const pi = await res.json();
      if (typeof pi.payment_method === "string") paymentMethod = pi.payment_method;
    }
  }

  const userRef = db!.collection("users").doc(uid);
  const receiptRef = db!.collection("minute_purchases").doc(String(session.id));
  await db!.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) return;
    const current = await tx.get(userRef);
    if (!current.exists) throw new Error("Minutes purchaser not found");
    tx.set(receiptRef, { uid, minutes, amount: session.amount_total ?? null, currency: session.currency ?? "inr",
                         createdAt: FieldValue.serverTimestamp() });
    const updates: Record<string, unknown> = {
      minutesBalance: FieldValue.increment(minutes),
      minutesBought: FieldValue.increment(minutes),
      stripeCustomerId: keptCustomer(current.data()?.stripeCustomerId, session.customer),
      lastMinutesPurchaseAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (autoAdd && paymentMethod) {
      updates.minutesAutoAdd = true;
      updates.minutesPaymentMethod = paymentMethod;
    }
    tx.set(userRef, updates, { merge: true });
  });
  console.log(`MINUTES: ${uid} +${minutes}${autoAdd ? " (auto add on)" : ""}`);
}

/**
 * India: one month of Pro or Max paid once (no AutoPay). Each paid session adds 30 days, from the current end when the
 * same plan is still running. creditsResetDate sits a day past the end so a lazy monthly refill can never extend a
 * pass; the backend's PassExpiryService moves the account back to free when passExpiresAt passes. Keyed on the
 * checkout session, so a session counts once however many events arrive.
 */
async function applyPlanPass(session: any) {
  const uid = session.metadata?.uid;
  const plan = session.metadata?.plan;
  if (typeof uid !== "string" || !uid || (plan !== "pro" && plan !== "max")) throw new Error("Invalid plan pass metadata");
  const allowance = INDIA_PLAN_ALLOWANCE[plan as keyof typeof INDIA_PLAN_ALLOWANCE];
  const userRef = db!.collection("users").doc(uid);
  const receiptRef = db!.collection("plan_passes").doc(String(session.id));
  await db!.runTransaction(async (tx) => {
    if ((await tx.get(receiptRef)).exists) return;
    const current = await tx.get(userRef);
    if (!current.exists) throw new Error("Plan pass buyer not found");
    const d = current.data() ?? {};
    const now = Date.now();
    const runningEnd = d.planSource === "pass" && d.plan === plan ? Date.parse(String(d.passExpiresAt ?? "")) : NaN;
    const start = Number.isFinite(runningEnd) && runningEnd > now ? runningEnd : now;
    const end = new Date(start + 30 * 86_400_000);
    const purchased = Math.max(0, Number(d.purchasedCredits ?? 0));
    const left = Number.isFinite(runningEnd) && runningEnd > now ? Math.max(0, Number(d.credits ?? 0) - purchased) : 0;
    tx.set(receiptRef, { uid, plan, amount: session.amount_total ?? null, currency: session.currency ?? "inr",
                         start: new Date(start).toISOString(), end: end.toISOString(), createdAt: FieldValue.serverTimestamp() });
    tx.set(userRef, {
      plan,
      planSource: "pass",
      passExpiresAt: end.toISOString(),
      credits: Math.min(left + allowance.credits, allowance.credits * 2) + purchased,
      creditsUsed: 0,
      creditsResetDate: new Date(end.getTime() + 86_400_000).toISOString(),
      audioMinutesAllowance: allowance.audioMinutes,
      audioMinutesUsed: 0,
      stripeCustomerId: keptCustomer(d.stripeCustomerId, session.customer),
      lastPaymentFailedAt: null,
      lastPassPurchaseAt: FieldValue.serverTimestamp(),
      // The Maya add-on bought with this month runs for the same 30 days.
      ...(session.metadata?.maya === "1" ? { mayaAddonUntil: end.toISOString(), mayaMonthly: MAYA_ADDON.interviewsIndia } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  console.log(`PLAN PASS: ${uid} ${plan} 30 days${session.metadata?.maya === "1" ? " with Maya" : ""}`);
  if (session.metadata?.maya === "1") await alertMayaBought(`India ${plan} month`);
}

/**
 * The Practice plan (owner, 2026-10-26): interviews with Maya plus live answers, on an account that stays on the free
 * plan otherwise. A subscription (mock_plan, `mockPlan` while it runs, renewed on invoice.paid) or an India month paid
 * once (mock_pass, `mockPlanUntil`). Its answers are given as credits, and its listening time as audioMinutesAllowance
 * (the Java backend reads that for any plan). A Pro or Max on the same account keeps its own, larger numbers.
 */
async function applyPractice(uid: string, opts: { india: boolean; subscriptionId?: string; session?: any; customer?: string }): Promise<boolean> {
  const userRef = db!.collection("users").doc(uid);
  // An India month is keyed on its checkout session, in the same transaction as the grant: a receipt written first left
  // a failed grant marked as done, so Stripe's retry gave nothing.
  const receiptRef = opts.session ? db!.collection("plan_passes").doc(`mock_${String(opts.session.id)}`) : null;
  const fresh = await db!.runTransaction(async (tx) => {
    if (receiptRef && (await tx.get(receiptRef)).exists) return false;
    const current = await tx.get(userRef);
    if (!current.exists) throw new Error("Practice buyer not found");
    const d = current.data() ?? {};
    const onPlan = typeof d.plan === "string" && d.plan !== "free" && d.planSource !== "trial";
    const purchased = Math.max(0, Number(d.purchasedCredits ?? 0));
    const size = opts.india ? MOCK_PLAN.creditsIndia : MOCK_PLAN.credits;
    // Paying again before an India month ends adds 30 days, and keeps what is left of the month.
    const running = Date.parse(String(d.mockPlanUntil ?? ""));
    const stacking = !!receiptRef && Number.isFinite(running) && running > Date.now();
    const until = receiptRef ? new Date((stacking ? running : Date.now()) + 30 * 86_400_000) : null;
    if (receiptRef) {
      tx.set(receiptRef, { uid, kind: "practice", amount: opts.session.amount_total ?? null, currency: opts.session.currency ?? "inr",
                           createdAt: FieldValue.serverTimestamp() });
    }
    tx.set(userRef, {
      ...(opts.subscriptionId ? { mockPlan: true, mockSubscriptionId: opts.subscriptionId } : {}),
      ...(until ? { mockPlanUntil: until.toISOString() } : {}),
      mayaMonthly: opts.india ? MOCK_PLAN.interviewsIndia : MOCK_PLAN.interviews,
      mockIndia: opts.india,
      // A paid Pro or Max already has more of both; only a free or trial account takes the Practice numbers.
      ...(onPlan ? {} : {
        credits: (stacking ? Math.max(purchased, Number(d.credits ?? 0)) : purchased) + size,
        creditsUsed: 0,
        audioMinutesUsed: 0,
        audioMinutesAllowance: opts.india ? MOCK_PLAN.audioMinutesIndia : MOCK_PLAN.audioMinutes,
      }),
      stripeCustomerId: keptCustomer(d.stripeCustomerId, opts.customer),
      lastPaymentFailedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
  console.log(`PRACTICE: ${uid}${opts.india ? " (India)" : ""}`);
  return fresh;
}

/** The Practice subscription ended: Maya and its answers stop (a Pro or Max on the account is untouched). */
async function endPractice(uid: string) {
  const userRef = db!.collection("users").doc(uid);
  await db!.runTransaction(async (tx) => {
    const d = (await tx.get(userRef)).data() ?? {};
    const onPlan = typeof d.plan === "string" && d.plan !== "free" && d.planSource !== "trial";
    tx.set(userRef, {
      mockPlan: false,
      mockSubscriptionId: null,
      ...(onPlan ? {} : { credits: Math.max(0, Number(d.purchasedCredits ?? 0)), audioMinutesAllowance: FieldValue.delete() }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  console.log(`PRACTICE ENDED: ${uid}`);
}

/** The Maya add-on bought once for an India plan paid once: it runs until that plan's month ends. */
async function applyMayaPass(session: any) {
  const uid = session.metadata?.uid;
  if (typeof uid !== "string" || !uid) throw new Error("Invalid Maya pass metadata");
  const userRef = db!.collection("users").doc(uid);
  const receiptRef = db!.collection("plan_passes").doc(`maya_${String(session.id)}`);
  await db!.runTransaction(async (tx) => {
    if ((await tx.get(receiptRef)).exists) return;
    const current = await tx.get(userRef);
    if (!current.exists) throw new Error("Maya pass buyer not found");
    const passEnd = Date.parse(String(current.data()?.passExpiresAt ?? ""));
    const until = new Date(Number.isFinite(passEnd) && passEnd > Date.now() ? passEnd : Date.now() + 30 * 86_400_000);
    tx.set(receiptRef, { uid, kind: "maya", amount: session.amount_total ?? null, currency: session.currency ?? "inr",
                         end: until.toISOString(), createdAt: FieldValue.serverTimestamp() });
    tx.set(userRef, { mayaAddonUntil: until.toISOString(), mayaMonthly: MAYA_ADDON.interviewsIndia,
                      updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  console.log(`MAYA PASS: ${uid}`);
  await alertMayaBought("India, paid once");
}

async function stripeGet(path: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE_SECRET}` } });
  if (!res.ok) throw new Error(`Stripe lookup failed: ${res.status}`);
  return res.json();
}

/** The invoice and subscription a charge paid for, if any. New Stripe API versions keep the link in invoice_payments, older ones on the charge. */
async function subscriptionOfCharge(charge: any, paymentIntentId: string | null): Promise<{ sub: any; invoice: any } | null> {
  let invoiceId: unknown = charge.invoice;
  if (!invoiceId && paymentIntentId) {
    const paid = await stripeGet(`invoice_payments?payment[type]=payment_intent&payment[payment_intent]=${encodeURIComponent(paymentIntentId)}&limit=1`);
    invoiceId = paid?.data?.[0]?.invoice;
  }
  const id = typeof invoiceId === "string" ? invoiceId : (invoiceId as any)?.id;
  if (!id) return null;
  const invoice = await stripeGet(`invoices/${encodeURIComponent(id)}`);
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  return subscriptionId ? { sub: await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`), invoice } : null;
}

/**
 * Takes one one-time purchase back. In one transaction with its receipt, so a charge is only ever taken back once.
 * False when there was nothing running to take back (an India month already ended or moved onto AutoPay).
 */
async function takeBackPurchase(uid: string, chargeId: string, purchase: Purchase): Promise<boolean> {
  const userRef = db!.collection("users").doc(uid);
  const receiptRef = db!.collection("plan_passes").doc(`refund_${chargeId}`);
  return db!.runTransaction(async (tx) => {
    if ((await tx.get(receiptRef)).exists) return true;
    const current = await tx.get(userRef);
    if (!current.exists) throw new Error("Refunded account not found");
    const d = current.data() ?? {};
    const purchased = Math.max(0, Number(d.purchasedCredits ?? 0));
    const now = Date.now();
    const u: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (purchase.kind === "pack") {
      u.credits = afterTakingBack(d.credits, purchase.credits);
      u.purchasedCredits = afterTakingBack(d.purchasedCredits, purchase.credits);
    } else if (purchase.kind === "minutes") {
      u.minutesBalance = afterTakingBack(d.minutesBalance, purchase.minutes);
    } else if (purchase.kind === "maya_pass") {
      u.mayaAddonUntil = FieldValue.delete();
    } else if (purchase.kind === "mock_pass") {
      const left = endAfterTakingBackMonth(d.mockPlanUntil, now);
      const onPlan = typeof d.plan === "string" && d.plan !== "free" && d.planSource !== "trial";
      u.mockPlanUntil = left ?? FieldValue.delete();
      if (!left && !onPlan) { u.credits = purchased; u.audioMinutesAllowance = FieldValue.delete(); }
    } else if (d.planSource === "pass") {
      const left = endAfterTakingBackMonth(d.passExpiresAt, now);
      if (left) {
        const allowance = INDIA_PLAN_ALLOWANCE[d.plan as keyof typeof INDIA_PLAN_ALLOWANCE];
        u.passExpiresAt = left;
        u.creditsResetDate = new Date(Date.parse(left) + 86_400_000).toISOString();
        // Only the month's own answers go down: bought packs sit inside credits too and were not refunded.
        u.credits = afterTakingBack(Number(d.credits ?? 0) - purchased, allowance?.credits ?? 0) + purchased;
      } else {
        u.plan = "free";
        u.planSource = "pass-refunded";
        u.passExpiresAt = FieldValue.delete();
        u.mayaAddonUntil = FieldValue.delete();
        u.credits = purchased;
        u.audioMinutesAllowance = FieldValue.delete();
      }
    } else {
      tx.set(receiptRef, { uid, kind: `refund_${purchase.kind}`, nothingRunning: true, createdAt: FieldValue.serverTimestamp() });
      return false;
    }
    tx.set(receiptRef, { uid, kind: `refund_${purchase.kind}`, createdAt: FieldValue.serverTimestamp() });
    tx.set(userRef, u, { merge: true });
    return true;
  });
}

/**
 * A charge was fully refunded or fully disputed: what it bought goes. A subscription is cancelled at Stripe at once, or it
 * would keep charging an account with no access, and its subscription.deleted event then downgrades the account as a
 * normal cancellation does. Anything that cannot be matched to an account is left for the owner.
 */
async function takeBackCharge(charge: any, why: string) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
  const intent = paymentIntentId ? await stripeGet(`payment_intents/${encodeURIComponent(paymentIntentId)}`) : null;
  const metadata = { ...charge.metadata, ...intent?.metadata };
  const purchase = purchaseFromMetadata(metadata);
  if (purchase && typeof metadata.uid === "string" && metadata.uid) {
    if (await takeBackPurchase(metadata.uid, String(charge.id), purchase)) {
      await sendOwnerAlert(`Replysis: ${why}`, `Charge ${charge.id} (${purchase.kind}) on account ${metadata.uid}: what it bought has been taken back.`);
    } else {
      await sendOwnerAlert(`Replysis: ${why}, please check`, `Charge ${charge.id} (${purchase.kind}) on account ${metadata.uid}: the account has no India month running any more (ended, or moved onto AutoPay), so nothing was changed. Check its plan and any subscription by hand.`);
    }
    return;
  }
  const found = await subscriptionOfCharge(charge, paymentIntentId);
  const sub = found?.sub;
  const uid = sub?.metadata?.uid;
  if (!sub || typeof uid !== "string" || !uid) {
    await sendOwnerAlert(`Replysis: ${why}, please check`, `Charge ${charge.id} could not be matched to an account, so nothing was changed.`);
    return;
  }
  // A mid-month charge paid only for a change: refunding the Maya add-on takes the add-on off, never the whole plan.
  if (subscriptionRefundScope(found!.invoice?.billing_reason) === "change") {
    const items: any[] = Array.isArray(sub?.items?.data) ? sub.items.data : [];
    const maya = items.find((it) => MAYA_PRICE_IDS.has(it?.price?.id));
    if (maya && sub.status !== "canceled") {
      const res = await fetch(`https://api.stripe.com/v1/subscription_items/${encodeURIComponent(maya.id)}?proration_behavior=none`,
        { method: "DELETE", headers: { Authorization: `Bearer ${STRIPE_SECRET}` } });
      if (!res.ok) throw new Error(`Stripe add-on removal failed: ${res.status}`);
      await sendOwnerAlert(`Replysis: ${why}`, `Charge ${charge.id} on account ${uid} paid for the Maya add-on mid-month: the add-on has been taken off subscription ${sub.id}. The plan itself carries on.`);
    } else {
      await sendOwnerAlert(`Replysis: ${why}, please check`, `Charge ${charge.id} on account ${uid} paid for a mid-month change to subscription ${sub.id} (not a month of the plan), so the plan was not cancelled. Check the plan by hand.`);
    }
    return;
  }
  if (sub.status !== "canceled") {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${STRIPE_SECRET}` } });
    if (!res.ok) throw new Error(`Stripe cancel failed: ${res.status}`);
  }
  await sendOwnerAlert(`Replysis: ${why}`, `Charge ${charge.id} on account ${uid}: subscription ${sub.id} has been cancelled and its paid access ends now.`);
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
  if ((event.type === "invoice.paid" || event.type === "charge.refunded" || event.type === "charge.dispute.created") && !STRIPE_SECRET) {
    console.error(`[webhook] STRIPE_SECRET_KEY is required to process ${event.type}`);
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
    // ── REFUNDS AND DISPUTES  -  only the whole charge removes access ──
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      if (isFullRefund(charge)) await takeBackCharge(charge, "a charge was refunded in full");
      else await sendOwnerAlert("Replysis: a partial refund", `Charge ${charge.id} was partly refunded (${charge.amount_refunded} of ${charge.amount}, ${charge.currency}). Nothing was changed on the account.`);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      const charge = await stripeGet(`charges/${encodeURIComponent(String(dispute.charge))}`);
      if (isFullDispute(dispute.amount, charge.amount)) await takeBackCharge(charge, "a charge was disputed");
      else await sendOwnerAlert("Replysis: a partial dispute", `Charge ${charge.id} is disputed for ${dispute.amount} of ${charge.amount} (${charge.currency}). Nothing was changed on the account.`);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }

    // ── INTERVIEW MINUTES (India)  -  added once the money is in ───────
    // A card is paid at completion. UPI can complete first and settle a moment later, which arrives
    // as async_payment_succeeded; the minutes are added on whichever of the two says paid.
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
        && event.data?.object?.metadata?.purchaseType === "minutes") {
      const session = event.data.object;
      if (session.payment_status === "paid") await addBoughtMinutes(session);
      else console.log(`[webhook] minutes checkout not paid yet (${session.payment_status})`);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }

    // ── PRACTICE PLAN ────────────────────────────────────────────
    // Its own subscription (metadata kind "mock"), kept apart from Pro and Max so neither changes the other.
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
        && ["mock_plan", "mock_pass"].includes(event.data?.object?.metadata?.purchaseType)) {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      if (typeof uid === "string" && uid && session.payment_status === "paid") {
        if (session.metadata.purchaseType === "mock_pass") {
          if (await applyPractice(uid, { india: true, session, customer: session.customer })) await alertMayaBought("Practice plan, India");
        } else {
          await applyPractice(uid, { india: session.currency === "inr", subscriptionId: session.subscription, customer: session.customer });
          await alertMayaBought("Practice plan");
        }
      }
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }
    if (event.data?.object?.object === "subscription" && event.data.object.metadata?.kind === "mock"
        && (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated")) {
      const sub = event.data.object;
      const uid = sub.metadata?.uid;
      const dead = ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);
      if (typeof uid === "string" && uid && (event.type === "customer.subscription.deleted" || dead)) await endPractice(uid);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }

    // ── MAYA ADD-ON FOR AN INDIA PLAN PAID ONCE ───────────────────
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
        && event.data?.object?.metadata?.purchaseType === "maya_pass") {
      const session = event.data.object;
      if (session.payment_status === "paid") await applyMayaPass(session);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }

    // ── INDIA PLAN, PAID ONCE  -  UPI may settle a moment after completion ──
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
        && event.data?.object?.metadata?.purchaseType === "plan_pass") {
      const session = event.data.object;
      if (session.payment_status === "paid") await applyPlanPass(session);
      else console.log(`[webhook] plan pass checkout not paid yet (${session.payment_status})`);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }

    // ── ANSWER PACK  -  added once the money is in, once per session ──
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
        && event.data?.object?.metadata?.purchaseType === "credit_pack") {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      const purchased = Number(session.metadata?.credits);
      if (uid && session.payment_status === "paid") {
        if (![500, 1500, 5000].includes(purchased)) throw new Error("Invalid credit pack metadata");
        const userRef = db.collection("users").doc(uid);
        const receiptRef = db.collection("plan_passes").doc(`pack_${String(session.id)}`);
        await db.runTransaction(async transaction => {
          if ((await transaction.get(receiptRef)).exists) return;
          const current = await transaction.get(userRef);
          if (!current.exists) throw new Error("Credit purchaser not found");
          transaction.set(receiptRef, { uid, kind: "pack", credits: purchased, amount: session.amount_total ?? null,
                                        currency: session.currency ?? null, createdAt: FieldValue.serverTimestamp() });
          transaction.set(userRef, {
            credits: FieldValue.increment(purchased),
            purchasedCredits: FieldValue.increment(purchased),
            creditPurchasesCount: FieldValue.increment(1),
            stripeCustomerId: keptCustomer(current.data()?.stripeCustomerId, session.customer),
            lastCreditPurchaseAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        });
        console.log(`CREDIT PACK: ${uid} +${purchased}`);
      } else if (session.payment_status !== "paid") console.log(`[webhook] answer pack not paid yet (${session.payment_status})`);
      await completeEvent(event.id);
      return NextResponse.json({ received: true });
    }

    // ── CHECKOUT COMPLETED  -  user just paid ──────────────────────
    if (event.type === "checkout.session.completed") {
      const session      = event.data.object;
      const uid          = session.metadata?.uid;
      const plan         = session.metadata?.plan;
      const customerId   = session.customer;
      const subscriptionId = session.subscription;

      if (uid && plan && ["pro", "max", "lifetime", "teams"].includes(plan)) {
        console.log(`✅ PAYMENT: ${uid} → ${plan} | Customer: ${customerId}`);
        const rupees = session.currency === "inr";
        const credits = monthCredits(plan, rupees);
        const allowance = rupees ? INDIA_PLAN_ALLOWANCE[plan as keyof typeof INDIA_PLAN_ALLOWANCE] : undefined;
        // Two open checkouts both complete: each subscription charges, and only the newest is stored. Stripe cannot refuse
        // this, so the owner is told at once.
        const stored = (await db.collection("users").doc(uid).get()).data()?.stripeSubscriptionId;
        if (typeof stored === "string" && stored && stored !== subscriptionId) {
          await sendOwnerAlert("Replysis: a customer has two subscriptions", `Account ${uid} now has two subscriptions in Stripe: ${stored} and ${subscriptionId}. Both will charge. Cancel the one not wanted and refund it.`);
        }
        // India AutoPay bought during a month paid once: that month carries on with its answers, and the subscription
        // (free until the month ends) takes over from then. planSource "subscription" stops the pass expiry job.
        const afterPass = session.metadata?.startsAfterPass === "1";
        await applyUserUpdate(uid, eventCreated, {
          plan,
          planSource: "subscription",
          ...(afterPass ? {} : { credits, creditsUsed: 0, audioMinutesUsed: 0,
                                 creditsResetDate: subscriptionResetDate(session.metadata?.interval, null) }),
          // Written here too: subscription.updated, which also writes it, is dropped if it arrives out of order.
          audioMinutesAllowance: allowance?.audioMinutes ?? FieldValue.delete(),
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId ?? null,
          stripeSubscriptionStatus: "active",
          stripeCancelAtPeriodEnd: false,
          stripeBillingInterval: session.metadata?.interval ?? null,
          mayaAddon: session.metadata?.maya === "1",
          mayaMonthly: session.currency === "inr" ? MAYA_ADDON.interviewsIndia : MAYA_ADDON.interviews,
          lastPaymentFailedAt: null,
        });
        if (session.metadata?.maya === "1") await alertMayaBought(`${plan} plan`);
      } else {
        console.error("[webhook] Missing or invalid checkout metadata");
      }
    }

    // ── SUBSCRIPTION CANCELED  -  revert to free ───────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const uid          = subscription.metadata?.uid;
      if (uid) await endSubscription(uid, eventCreated, subscription, "canceled");
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
        const plan = sub.metadata?.kind === "mock" ? null : subscriptionPlan(sub);
        // The Practice plan's monthly refill (its first invoice is the checkout, already applied).
        if (sub.metadata?.kind === "mock" && typeof uid === "string" && invoice.billing_reason === "subscription_cycle") {
          await applyPractice(uid, { india: String(invoice.currency) === "inr", subscriptionId: subscriptionId, customer: sub.customer });
        }
        // A plan change or add-on charged mid-month is not a renewal either.
        const midMonth = invoice.billing_reason === "subscription_update";
        // The free invoice that opens an AutoPay waiting for a paid month to end is not a renewal: no refill.
        const freeTrialStart = Number(invoice.amount_paid ?? 0) === 0 && sub.status === "trialing";

        if (uid && plan && ["pro", "max", "teams"].includes(plan) && !freeTrialStart && !midMonth) { // lifetime is one-time, no renewal
          const credits = monthCredits(plan, boughtInRupees(sub));
          await applyUserUpdate(uid, eventCreated, {
            plan,
            credits,
            creditsUsed:      0,
            audioMinutesUsed: 0,
            creditsResetDate: subscriptionResetDate(subscriptionInterval(sub), subscriptionPeriodEnd(sub)),
            stripeCustomerId: sub.customer ?? null,
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: sub.status ?? "active",
            stripeCancelAtPeriodEnd: sub.cancel_at_period_end === true,
            stripeCurrentPeriodEnd: subscriptionPeriodEnd(sub),
            stripeBillingInterval: subscriptionInterval(sub),
            ...mayaFields(sub),
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
        await endSubscription(uid, eventCreated, sub, String(sub.status));
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
              // A Practice subscription has its own life: this field describes Pro or Max.
              // While Stripe retries, the lazy monthly refill is held off: the paid renewal's invoice.paid sets the real date.
              // Only a failed renewal holds it: a failed mid-month charge (an add-on, a plan change) leaves the month alone.
              ...(sub.metadata?.kind === "mock" ? {} : { stripeSubscriptionStatus: sub.status ?? "past_due",
                ...(invoice.billing_reason === "subscription_cycle"
                  ? { creditsResetDate: new Date(Date.now() + 30 * 86_400_000).toISOString() } : {}) }),
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
