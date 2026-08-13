// frontend/app/api/stripe/checkout/route.ts
// ═══════════════════════════════════════════════════════════════
// Creates Stripe Checkout session for Pro ($29.99/mo) and Max ($49.99/mo)
// After payment, Stripe redirects to /pricing?success=true
// Stripe webhook updates Firestore plan + credits
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { rateLimit, clientIp } from "../../../lib/rate-limit";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const MAX_REQUEST_BYTES = 16 * 1024;

// ── Firebase Admin init (shared singleton) ──────────────────────
function ensureAdminInit() {
  if (getApps().length) return;
  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return;
  try {
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  } catch (e) {
    console.error("[checkout] Firebase Admin init error:", e);
  }
}

// ── STRIPE PRICE IDS  -  create these in Stripe Dashboard ──
// Go to: dashboard.stripe.com → Products → Create Product
// Pro Monthly   → $29.99/mo  → copy price ID → STRIPE_PRO_MONTHLY_PRICE
// Pro Annual    → $299.88/yr → copy price ID → STRIPE_PRO_ANNUAL_PRICE
// Max Monthly   → $49.99/mo  → copy price ID → STRIPE_MAX_MONTHLY_PRICE
// Max Annual    → $499/yr    → copy price ID → STRIPE_MAX_ANNUAL_PRICE
const PRICE_IDS: Record<string, string> = {
  pro_monthly:    process.env.STRIPE_PRO_MONTHLY_PRICE    || "price_REPLACE_ME",
  pro_annual:     process.env.STRIPE_PRO_ANNUAL_PRICE     || "price_REPLACE_ME",
  max_monthly:    process.env.STRIPE_MAX_MONTHLY_PRICE    || "price_REPLACE_ME",
  max_annual:     process.env.STRIPE_MAX_ANNUAL_PRICE     || "price_REPLACE_ME",
};

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`stripe:checkout:${clientIp(req)}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many checkout requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
    }
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    // ── VERIFY FIREBASE ID TOKEN ──────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    ensureAdminInit();
    if (!getApps().length) {
      return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
    }
    let verifiedUid: string;
    let verifiedEmail: string | undefined;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      verifiedUid   = decoded.uid;
      verifiedEmail = decoded.email;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { plan, annual, uid } = body;

    if (!STRIPE_SECRET || STRIPE_SECRET.length < 10) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Reject unknown plans  -  prevents crafted requests from creating
    // checkout sessions with arbitrary metadata values.
    if (typeof plan !== "string" || !["pro", "max"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Verify the requested uid matches the authenticated user
    if (typeof uid !== "string" || uid !== verifiedUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Always use server-verified email, not client-supplied value
    const email = verifiedEmail ?? "";

    if (annual !== undefined && typeof annual !== "boolean") {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }
    // Pro and Max are both recurring, so every plan resolves to a billing period.
    const priceKey = `${plan}_${annual ? "annual" : "monthly"}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId || priceId === "price_REPLACE_ME") {
      // Price not configured yet. Don't leak the internal env-key name to the
      // client; log it server-side and show the user a graceful message.
      console.error(`[checkout] Missing Stripe price ID for "${priceKey}". Set the matching STRIPE_*_PRICE env var.`);
      return NextResponse.json(
        { error: "This plan isn't available for checkout yet. Please try another plan or contact support." },
        { status: 503 }
      );
    }

    // Create Stripe Checkout Session using fetch (no SDK needed).
    // SECURITY: completion URLs come from an allowlist, never the raw Origin
    // header — a crafted Origin could otherwise send the user to an attacker
    // page immediately after a real payment.
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://replysis.com";
    const ALLOWED_ORIGINS = new Set([SITE_URL, "http://localhost:3000"]);
    const requestOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : SITE_URL;

    const params = new URLSearchParams();
    // Pro and Max are both recurring. The one-time payment path went away with
    // the Lifetime plan, which was retired.
    params.append("mode", "subscription");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}/pricing?success=true`);
    params.append("cancel_url", `${origin}/pricing?canceled=true`);
    params.append("customer_email", email || "");
    params.append("metadata[uid]", uid);
    params.append("metadata[plan]", plan);
    params.append("subscription_data[metadata][uid]", uid);
    params.append("subscription_data[metadata][plan]", plan);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 500 });
  }
}
