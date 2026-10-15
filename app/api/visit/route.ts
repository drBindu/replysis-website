import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { clientIp, rateLimit } from "../../lib/rate-limit";
import { countryOf } from "../../lib/buyer-country";

// Counts people who open the website, without cookies and without keeping an address.
//
// A browser says "someone opened this page" once per page view. The server turns the visitor's address and browser
// into a one-way fingerprint that is only good for that UTC day, and stores that, a country code, a device type and
// the page. The address itself is never written anywhere, and tomorrow the same person is a new fingerprint, so
// nobody can be followed from one day to the next. Only a real browser runs the page script that calls this, which is
// what keeps scanners and crawlers out of the count.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT = /bot|spider|crawl|slurp|scan|probe|monitor|uptime|headless|lighthouse|preview|curl|wget|python|java|go-http|okhttp|axios|node-fetch|facebookexternalhit|whatsapp|telegram|discord|slack|security|research|palo alto/i;
const SALT = process.env.VISIT_SALT || "replysis-visits-v1";

function db(): Firestore | null {
  if (getApps().length) return getFirestore();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    if (!privateKey.includes("-----BEGIN")) privateKey = Buffer.from(privateKey, "base64").toString("utf8");
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return getFirestore();
  } catch {
    return null;
  }
}

function cleanPath(value: unknown): string {
  const p = typeof value === "string" ? value.split("?")[0].split("#")[0] : "/";
  return p.startsWith("/") ? p.slice(0, 80) : "/";
}

function cleanReferrer(value: unknown, ownHost: string): string {
  if (typeof value !== "string" || !value) return "direct";
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host && host !== ownHost ? host.slice(0, 60) : "direct";
  } catch {
    return "direct";
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  // A real person opens a handful of pages a minute; this only stops a script from filling the table.
  if (!rateLimit(`visit:${ip}`, 40, 60_000).ok) return new NextResponse(null, { status: 204 });

  const ua = req.headers.get("user-agent") || "";
  if (!ua || ua.length < 20 || BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let body: { path?: unknown; ref?: unknown } = {};
  try {
    const text = await req.text();
    if (text.length < 2000) body = JSON.parse(text || "{}");
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = cleanPath(body.path);
  if (path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });

  const firestore = db();
  if (!firestore) return new NextResponse(null, { status: 204 });

  const day = new Date().toISOString().slice(0, 10);
  const id = createHash("sha256").update(`${ip}|${ua}|${day}|${SALT}`).digest("hex").slice(0, 20);
  const ref = firestore.collection("site_visits").doc(`${day}-${id}`);
  const country = ((await countryOf(req.headers).catch(() => null)) || "??").toUpperCase().slice(0, 2);
  const device = /mobi|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
  const referrer = cleanReferrer(body.ref, new URL(req.url).hostname.replace(/^www\./, ""));
  const now = FieldValue.serverTimestamp();

  try {
    await ref.create({ day, country, device, referrer, landing: path, lastPath: path, pages: 1, firstSeen: now, lastSeen: now });
  } catch {
    // Already counted today: this is another page view by the same visitor.
    await ref.update({ lastPath: path, pages: FieldValue.increment(1), lastSeen: now }).catch(() => {});
  }
  return new NextResponse(null, { status: 204 });
}
