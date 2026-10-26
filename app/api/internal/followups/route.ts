// One follow-up email a day after sign-up, chosen by what the person actually did (owner, 2026-10-26: "follow up every
// user who signs up"). 11 of 15 new accounts in a week never opened the app; one person tried Maya for a minute and left.
//
// Called every hour by a timer on the server (podman exec into this container, so the token never leaves it). Looks at
// accounts made 20 to 72 hours ago, sends each at most one email, ever (claimed in _alerts/followup-<uid> first, so two
// website copies can never both send), and none to anyone already getting answers, anyone who unsubscribed, or test
// accounts. Every email has the one-click unsubscribe line (sendMails).
import { NextResponse } from "next/server";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ensureAdmin } from "../../../lib/verify-user";
import { mailConfigured, sendMails, unsubscribeToken } from "../../../lib/user-mail";

export const dynamic = "force-dynamic";

const ms = (v: any): number | null =>
  v?.toDate ? v.toDate().getTime() : typeof v === "string" ? Date.parse(v) || null : typeof v === "number" ? v : null;

type Kind = "no-app" | "mock-only" | "no-answer";

function email(kind: Kind, first: string, trial: boolean): { subject: string; text: string } {
  const hi = `Hi${first ? " " + first : ""},`;
  const offer = trial ? "Your 3 day Pro trial with 50 answers" : "Your free answers";
  if (kind === "no-app") return {
    subject: trial ? "Your Replysis Pro trial is waiting" : "Your first Replysis answer",
    text: `${hi}

Thanks for signing up for Replysis. ${offer} ${trial ? "is" : "are"} ready for you.

Replysis works during the real interview: it listens with you and shows a clear answer on your screen in under a second. To try it:

1. Get the app for Windows or Mac: https://replysis.com/start
2. Open it, sign in, and press Start
3. Ask a practice question out loud and watch the answer appear

You can also practise first with Maya, our mock interviewer: https://replysis.com/mock-interview

If anything stops you, just reply to this email and we will help.

The Replysis team`,
  };
  if (kind === "mock-only") return {
    subject: "Your Replysis mock interview",
    text: `${hi}

Thank you for trying a mock interview with Maya. A tip for your next practice: use headphones in a quiet room and answer her out loud, the way you would in a real interview. At the end she shows feedback on every answer and a stronger version to learn from.

When your real interview comes, the Replysis app for Windows or Mac listens with you and shows a clear answer on your screen in under a second. ${offer} ${trial ? "includes" : "work in"} the app: https://replysis.com/start

If anything did not work or was unclear, just reply to this email and we will help you right away.

The Replysis team`,
  };
  return {
    subject: "Getting your first answer in Replysis",
    text: `${hi}

Thanks for installing Replysis. Here is the quickest way to your first answer:

1. Open Replysis and press Start
2. Ask an interview question out loud, or play an interview question video
3. The answer appears on your screen in under a second

If no words appear while someone is speaking, open Settings in the app and check that the microphone and speaker are the ones you use. Or just reply to this email and we will help you set it up.

The Replysis team`,
  };
}

export async function POST(req: Request) {
  if (!ensureAdmin()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const token = req.headers.get("x-followup-token") || "";
  if (!token || token !== unsubscribeToken("followup-timer")) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!mailConfigured()) return NextResponse.json({ error: "no email key" }, { status: 503 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const db = getFirestore();
  const now = Date.now();
  const users = await db.collection("users")
    .where("createdAt", ">=", Timestamp.fromMillis(now - 72 * 3600_000))
    .where("createdAt", "<=", Timestamp.fromMillis(now - 20 * 3600_000))
    .get();

  const report: { who: string; kind: string }[] = [];
  for (const doc of users.docs) {
    const d = doc.data();
    const to = typeof d.email === "string" ? d.email : "";
    if (!to.includes("@") || d.emailOptOut === true || d.internal === true) continue;

    const events = await db.collection("usage_events").where("identityId", "==", doc.id).get();
    const actions = events.docs.map((e) => String(e.data().action ?? ""));
    const answers = actions.filter((a) => a === "answer" || a === "screen").length;
    const mock = actions.some((a) => a === "question_generation" || a.startsWith("mock_"));
    const appOpened = !!ms(d.appOpenedAt) || d.lastPlatform === "windows" || d.lastPlatform === "mac";
    const kind: Kind | null = answers > 0 ? null : appOpened ? "no-answer" : mock ? "mock-only" : "no-app";
    const masked = to.replace(/^(.{3}).*@/, "$1***@");
    if (!kind) { report.push({ who: masked, kind: "already using it, no email" }); continue; }
    if (dry) { report.push({ who: masked, kind: `would send ${kind}` }); continue; }

    // Claimed before sending: if two copies of the site run this together, only one sends.
    try { await db.collection("_alerts").doc(`followup-${doc.id}`).create({ sentAt: now, kind }); }
    catch { continue; }
    const first = String(d.displayName ?? "").trim().split(/\s+/)[0] ?? "";
    const m = email(kind, first, d.planSource === "trial");
    const result = await sendMails([{ to, uid: doc.id, subject: m.subject, text: m.text }]);
    await doc.ref.set({ followupKind: kind, followupSentAt: new Date(), followupSent: result.sent === 1 }, { merge: true });
    report.push({ who: masked, kind: result.sent === 1 ? `sent ${kind}` : `failed: ${result.error ?? ""}` });
  }
  return NextResponse.json({ checked: users.size, report });
}
