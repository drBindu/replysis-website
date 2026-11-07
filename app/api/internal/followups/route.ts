// One follow-up email a few hours after sign-up, chosen by what the person actually did (owner, 2026-10-26: "follow up every
// user who signs up"). 11 of 15 new accounts in a week never opened the app; one person tried Maya for a minute and left.
//
// Called every hour by a timer on the server (podman exec into this container, so the token never leaves it). Looks at
// accounts made 6 to 72 hours ago (6: the 1 day trial must still be running when it arrives), sends each at most one email, ever (claimed in _alerts/followup-<uid> first, so two
// website copies can never both send), and none to anyone already getting answers, anyone who unsubscribed, or test
// accounts. Every email has the one-click unsubscribe line (sendMails).
import { NextResponse } from "next/server";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ensureAdmin } from "../../../lib/verify-user";
import { mailConfigured, sendMails, unsubscribeToken } from "../../../lib/user-mail";
import { isPaidPlan, mayaAccess } from "../../../lib/paid-plan";
import { customerEmailKeys, emailedRecently, mayaTasteDue, onePerPerson } from "../../../lib/email-plan";
import { MOCK_PLAN } from "../../../../data/mayaAddon";

export const dynamic = "force-dynamic";

const ms = (v: any): number | null =>
  v?.toDate ? v.toDate().getTime() : typeof v === "string" ? Date.parse(v) || null : typeof v === "number" ? v : null;

type Kind = "no-app" | "mock-only" | "no-answer";

/** When we last emailed this person (follow-up, upgrade or trial reminder), from the _alerts claims. */
async function lastEmails(db: FirebaseFirestore.Firestore, uid: string): Promise<number[]> {
  const refs = customerEmailKeys(uid).map((k) => db.collection("_alerts").doc(k));
  const snaps = await db.getAll(...refs);
  return snaps.map((s) => Number(s.exists ? s.data()?.sentAt : 0) || 0);
}

function email(kind: Kind, first: string, trial: boolean): { subject: string; text: string } {
  const hi = `Hi${first ? " " + first : ""},`;
  const offer = trial ? "Your 1 day free trial with 50 answers" : "Your free answers";
  if (kind === "no-app") return {
    subject: trial ? "Your Replysis free trial is waiting" : "Your first Replysis answer",
    text: `${hi}

Thanks for signing up for Replysis. ${offer} ${trial ? "is" : "are"} ready for you.

Replysis works during the real interview: it listens with you and shows a clear answer on your screen in about a second. To try it:

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

When your real interview comes, the Replysis app for Windows or Mac listens with you and shows a clear answer on your screen in about a second. ${offer} ${trial ? "includes" : "work in"} the app: https://replysis.com/start

If anything did not work or was unclear, just reply to this email and we will help you right away.

The Replysis team`,
  };
  return {
    subject: "Getting your first answer in Replysis",
    text: `${hi}

Thanks for installing Replysis. Here is the quickest way to your first answer:

1. Open Replysis and press Start
2. Ask an interview question out loud, or play an interview question video
3. The answer appears on your screen in about a second

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
    .where("createdAt", "<=", Timestamp.fromMillis(now - 6 * 3600_000))
    .get();

  const report: { who: string; kind: string }[] = [];
  for (const doc of users.docs) {
    const d = doc.data();
    const to = typeof d.email === "string" ? d.email : "";
    if (!to.includes("@") || d.emailOptOut === true || d.internal === true) continue;

    const events = await db.collection("usage_events").where("identityId", "==", doc.id).get();
    const actions = events.docs.map((e) => String(e.data().action ?? ""));
    const answers = actions.filter((a) => a === "answer" || a === "screen").length;
    // A Maya interview counts as trying it: cyberguru8095 had one and got the "get the app" email (2026-10-28).
    const mock = d.mayaFreeUsed === true || actions.some((a) => a === "question_generation" || a.startsWith("mock_"));
    const appOpened = !!ms(d.appOpenedAt) || d.lastPlatform === "windows" || d.lastPlatform === "mac";
    const kind: Kind | null = answers > 0 ? null : appOpened ? "no-answer" : mock ? "mock-only" : "no-app";
    const masked = to.replace(/^(.{3}).*@/, "$1***@");
    if (!kind) { report.push({ who: masked, kind: "already using it, no email" }); continue; }
    // Never two emails from us within 12 hours: an upgrade email or the trial reminder may have just gone out.
    if (emailedRecently(await lastEmails(db, doc.id), now)) { report.push({ who: masked, kind: `${kind} held: emailed recently` }); continue; }
    if (dry) { report.push({ who: masked, kind: `would send ${kind}` }); continue; }

    // Claimed before sending: if two copies of the site run this together, only one sends.
    try { await db.collection("_alerts").doc(`followup-${doc.id}`).create({ sentAt: now, kind }); }
    catch { continue; }
    const first = (String(d.displayName ?? "").trim().split(/\s+/)[0] ?? "").replace(/^User$/, "");
    const m = email(kind, first, d.planSource === "trial");
    const result = await sendMails([{ to, uid: doc.id, subject: m.subject, text: m.text }]);
    // A failed send gives the claim back, so the next hour tries again instead of the email being lost for good.
    if (result.sent !== 1) await db.collection("_alerts").doc(`followup-${doc.id}`).delete().catch(() => {});
    await doc.ref.set({ followupKind: kind, followupSentAt: new Date(), followupSent: result.sent === 1 }, { merge: true });
    report.push({ who: masked, kind: result.sent === 1 ? `sent ${kind}` : `failed: ${result.error ?? ""}` });
  }
  // ── Upgrade emails (owner, 2026-10-27) ──
  // The iPhone app may not point to the website to pay (outside the US), so the moments that matter get one email each,
  // from the server, with the plans link: someone who used their free interview with Maya and did not buy, and someone
  // who ran out of answers. Once per person per kind, ever, and only for people active in the last two weeks.
  const recent = now - 14 * 24 * 3600_000;
  const upgrade: { uid: string; doc: FirebaseFirestore.QueryDocumentSnapshot; kind: "maya-taste" | "out-of-answers" }[] = [];
  const tasted = await db.collection("users").where("mayaFreeUsed", "==", true).get();
  for (const doc of tasted.docs) {
    const d = doc.data();
    if (mayaTasteDue(isPaidPlan(d), mayaAccess(d, now).state === "ok", ms(d.mayaFreeUsedAt), now)) upgrade.push({ uid: doc.id, doc, kind: "maya-taste" });
  }
  const empty = await db.collection("users").where("credits", "<", 5).get();
  for (const doc of empty.docs) {
    const d = doc.data();
    const seen = ms(d.lastActive) ?? 0;
    const paid = typeof d.plan === "string" && d.plan !== "free" && d.planSource !== "trial";
    if (!paid && d.mockPlan !== true && Number(d.minutesBalance ?? 0) <= 0 && seen > recent && Number(d.creditsUsed ?? 0) > 0) {
      upgrade.push({ uid: doc.id, doc, kind: "out-of-answers" });
    }
  }
  // Kinds already sent are dropped first, so a person who had the out of answers email still gets the Maya one later.
  const pending: typeof upgrade = [];
  for (const u of upgrade) {
    if (!(await db.collection("_alerts").doc(`upgrade-${u.kind}-${u.uid}`).get()).exists) pending.push(u);
  }
  for (const { doc, kind } of onePerPerson(pending)) {
    const d = doc.data();
    const to = typeof d.email === "string" ? d.email : "";
    if (!to.includes("@") || d.emailOptOut === true || d.internal === true) continue;
    const masked = to.replace(/^(.{3}).*@/, "$1***@");
    // Emailed anything in the last 12 hours (the follow-up above included): later.
    const claimRef = db.collection("_alerts").doc(`upgrade-${kind}-${doc.id}`);
    if (emailedRecently(await lastEmails(db, doc.id), now)) { report.push({ who: masked, kind: `${kind} held: emailed recently` }); continue; }
    if (dry) { report.push({ who: masked, kind: `would send ${kind}` }); continue; }
    try { await claimRef.create({ sentAt: now, kind }); }
    catch { continue; }
    // "User" is only the placeholder name: "Hi User" read as a mass mail (the follow-up above already drops it).
    const first = (String(d.displayName ?? "").trim().split(/\s+/)[0] ?? "").replace(/^User$/, "");
    const m = upgradeEmail(kind, first, d.planSource === "trial-ended");
    const result = await sendMails([{ to, uid: doc.id, subject: m.subject, text: m.text }]);
    if (result.sent !== 1) await claimRef.delete().catch(() => {});
    report.push({ who: masked, kind: result.sent === 1 ? `sent ${kind}` : `failed: ${result.error ?? ""}` });
  }
  return NextResponse.json({ checked: users.size, report });
}

function upgradeEmail(kind: "maya-taste" | "out-of-answers", first: string, trialEnded = false): { subject: string; text: string } {
  const hi = `Hi${first ? " " + first : ""},`;
  if (kind === "maya-taste") return {
    subject: "Keep practising with Maya",
    text: `${hi}

Thanks for your interview with Maya. The more you practise out loud, the calmer and clearer you get in the real one.

The Practice plan gives you interviews with Maya every month, with feedback and a stronger answer for every question, plus live answers for your real interviews. It is $${MOCK_PLAN.usd} a month (Rs ${MOCK_PLAN.inr} in India). Max includes Maya, and Pro can add her.

See the plans: https://replysis.com/pricing

Once you have a plan, it works on the website and in the Replysis apps with the same account.

The Replysis team`,
  };
  // A trial that ran out of time holds 0 answers too, but its owner did not use them all: telling them they had was
  // simply wrong (2026-11-07, the trial is 1 day, so most trial accounts end this way).
  if (trialEnded) return {
    subject: "Your Replysis free trial has ended",
    text: `${hi}

Your free trial has ended, so answers are paused for now. To keep getting answers in your interviews, choose a plan here:

https://replysis.com/pricing

Pro and Max give you answers every month. If you mostly want to practise, the Practice plan includes interviews with Maya and live answers.

Once you have a plan, it works on the website and in the Replysis apps with the same account.

The Replysis team`,
  };
  return {
    subject: "You have used your Replysis answers",
    text: `${hi}

You have used all your answers. To keep getting answers in your interviews, choose a plan here:

https://replysis.com/pricing

Pro and Max give you answers every month. If you mostly want to practise, the Practice plan includes interviews with Maya and live answers.

Once you have a plan, it works on the website and in the Replysis apps with the same account.

The Replysis team`,
  };
}
