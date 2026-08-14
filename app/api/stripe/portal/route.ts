import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { clientIp, rateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://replysis.com";
const PORTAL_CONFIGURATION_VERSION = "phase3-v1";

const PRICE_IDS = [
  process.env.STRIPE_PRO_MONTHLY_PRICE,
  process.env.STRIPE_PRO_ANNUAL_PRICE,
  process.env.STRIPE_MAX_MONTHLY_PRICE,
  process.env.STRIPE_MAX_ANNUAL_PRICE,
].filter((value): value is string => Boolean(value && !value.includes("REPLACE_ME")));

function ensureAdminInit() {
  if (getApps().length) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return false;

  try {
    let privateKey = privateKeyInput;
    if (!privateKey.includes("-----BEGIN")) {
      privateKey = Buffer.from(privateKey, "base64").toString("utf8");
    }
    privateKey = privateKey.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return true;
  } catch (error) {
    console.error("[billing-portal] Firebase Admin initialization failed", error);
    return false;
  }
}

async function stripeRequest(path: string, init?: RequestInit) {
  return fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

async function portalProducts() {
  const grouped = new Map<string, string[]>();
  const prices = await Promise.all(
    PRICE_IDS.map(async (priceId) => {
      const response = await stripeRequest(`/prices/${encodeURIComponent(priceId)}`);
      if (!response.ok) throw new Error(`Stripe price lookup failed: ${response.status}`);
      return response.json();
    }),
  );

  for (const price of prices) {
    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    if (typeof productId !== "string" || typeof price.id !== "string") continue;
    grouped.set(productId, [...(grouped.get(productId) ?? []), price.id]);
  }

  return [...grouped.entries()].map(([product, pricesForProduct]) => ({
    product,
    prices: pricesForProduct,
  }));
}

async function getOrCreatePortalConfiguration() {
  const listResponse = await stripeRequest("/billing_portal/configurations?active=true&limit=100");
  if (!listResponse.ok) throw new Error(`Stripe portal lookup failed: ${listResponse.status}`);
  const list = await listResponse.json();
  const existing = Array.isArray(list.data)
    ? list.data.find((item: any) => item?.metadata?.replysis_version === PORTAL_CONFIGURATION_VERSION)
    : null;
  if (existing?.id) return existing.id as string;

  const products = await portalProducts();
  const params = new URLSearchParams();
  params.set("business_profile[headline]", "Manage your Replysis plan securely.");
  params.set("business_profile[privacy_policy_url]", `${SITE_URL}/privacy`);
  params.set("business_profile[terms_of_service_url]", `${SITE_URL}/terms`);
  params.set("default_return_url", `${SITE_URL}/account`);
  params.set("features[customer_update][enabled]", "true");
  params.append("features[customer_update][allowed_updates][]", "name");
  params.append("features[customer_update][allowed_updates][]", "address");
  params.set("features[invoice_history][enabled]", "true");
  params.set("features[payment_method_update][enabled]", "true");
  params.set("features[subscription_cancel][enabled]", "true");
  params.set("features[subscription_cancel][mode]", "at_period_end");
  params.set("features[subscription_update][enabled]", products.length ? "true" : "false");
  if (products.length) {
    params.append("features[subscription_update][default_allowed_updates][]", "price");
    params.set("features[subscription_update][proration_behavior]", "create_prorations");
    products.forEach((entry, productIndex) => {
      params.set(`features[subscription_update][products][${productIndex}][product]`, entry.product);
      entry.prices.forEach((priceId, priceIndex) => {
        params.set(`features[subscription_update][products][${productIndex}][prices][${priceIndex}]`, priceId);
      });
    });
  }
  params.set("login_page[enabled]", "false");
  params.set("metadata[managed_by]", "replysis");
  params.set("metadata[replysis_version]", PORTAL_CONFIGURATION_VERSION);

  const createResponse = await stripeRequest("/billing_portal/configurations", {
    method: "POST",
    body: params,
  });
  const configuration = await createResponse.json();
  if (!createResponse.ok || !configuration?.id) {
    console.error("[billing-portal] Stripe configuration error", configuration?.error?.type ?? createResponse.status);
    throw new Error("Stripe portal configuration failed");
  }
  return configuration.id as string;
}

export async function POST(req: Request) {
  const limit = rateLimit(`stripe:portal:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many billing requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!STRIPE_SECRET || STRIPE_SECRET.length < 10) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }
  if (!ensureAdminInit()) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  let verifiedEmail = "";
  try {
    const decoded = await getAuth().verifyIdToken(idToken, true);
    uid = decoded.uid;
    verifiedEmail = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getFirestore().collection("users").doc(uid).get();
    const profileData = profile.data() ?? {};
    const customerId = profileData.stripeCustomerId;
    if (typeof customerId !== "string" || !customerId.startsWith("cus_")) {
      return NextResponse.json({ error: "No billing account exists yet" }, { status: 400 });
    }

    // Billing references are server-managed in Firestore, but also verify the
    // Stripe object belongs to this signed-in identity before issuing a
    // short-lived portal session. This keeps the boundary safe even if storage
    // rules are accidentally loosened in a future deployment.
    const customerResponse = await stripeRequest(`/customers/${encodeURIComponent(customerId)}`);
    if (!customerResponse.ok) throw new Error(`Stripe customer lookup failed: ${customerResponse.status}`);
    const customer = await customerResponse.json();
    const customerEmail = typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : "";
    let belongsToUser = Boolean(verifiedEmail && customerEmail && verifiedEmail === customerEmail);

    const subscriptionId = profileData.stripeSubscriptionId;
    if (!belongsToUser && typeof subscriptionId === "string" && subscriptionId.startsWith("sub_")) {
      const subscriptionResponse = await stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
      if (subscriptionResponse.ok) {
        const subscription = await subscriptionResponse.json();
        belongsToUser = subscription?.customer === customerId && subscription?.metadata?.uid === uid;
      }
    }
    if (!belongsToUser) {
      console.warn("[billing-portal] Billing ownership verification failed", uid);
      return NextResponse.json({ error: "Billing account could not be verified" }, { status: 403 });
    }

    const configuration = await getOrCreatePortalConfiguration();
    const params = new URLSearchParams({
      customer: customerId,
      configuration,
      return_url: `${SITE_URL}/account?billing=returned`,
    });
    const response = await stripeRequest("/billing_portal/sessions", { method: "POST", body: params });
    const session = await response.json();
    if (!response.ok || typeof session?.url !== "string") {
      console.error("[billing-portal] Stripe session error", session?.error?.type ?? response.status);
      return NextResponse.json({ error: "Unable to open billing management" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing-portal] Unable to create portal session", (error as Error)?.message ?? "Error");
    return NextResponse.json({ error: "Unable to open billing management" }, { status: 502 });
  }
}
