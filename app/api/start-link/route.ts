// Emails the signed-in person a link to /start, for someone who signed up on a phone and needs the app on a laptop.
// Only ever to the account's own verified address, at most 3 a day, so it cannot be used to send mail to others.
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { ensureAdmin } from "../../lib/verify-user";
import { rateLimit } from "../../lib/rate-limit";
import { mailConfigured, sendMails } from "../../lib/user-mail";

export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://replysis.com";

export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !ensureAdmin()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let uid = "", email = "";
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = typeof decoded.email === "string" ? decoded.email : "";
  } catch {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (!email) return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });
  if (!mailConfigured()) return NextResponse.json({ error: "Email is not available right now." }, { status: 503 });

  const limit = rateLimit(`start-link:${uid}`, 3, 24 * 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Link already sent. Please check your inbox and spam folder." }, { status: 429 });

  const result = await sendMails([{
    to: email,
    uid,
    subject: "Your Replysis download link",
    text: [
      "Hi,",
      "",
      "Here is the link you asked for. Open it on the laptop you will use for interviews:",
      "",
      `${SITE}/start`,
      "",
      "1. Download and install Replysis.",
      "2. Sign in with this same account.",
      "3. Press Start and say \"Tell me about yourself\". Your answer appears in about a second.",
      "",
      "Replysis",
    ].join("\n"),
  }]);
  if (!result.sent) return NextResponse.json({ error: "The email could not be sent. Please try again in a minute." }, { status: 502 });
  return NextResponse.json({ ok: true, to: email });
}
