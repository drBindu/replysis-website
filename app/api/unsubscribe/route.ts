import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { validUnsubscribe } from "../../lib/user-mail";

export const dynamic = "force-dynamic";

function db() {
  if (!getApps().length) {
    let key = process.env.FIREBASE_PRIVATE_KEY || "";
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }) });
  }
  return getFirestore();
}

/** The account the link is for, or null when the link was not made by us. */
function linkUid(req: Request): string | null {
  const url = new URL(req.url);
  const uid = url.searchParams.get("u") || "";
  const t = url.searchParams.get("t") || "";
  return /^[A-Za-z0-9_-]{6,128}$/.test(uid) && validUnsubscribe(uid, t) ? uid : null;
}

// update, not set: an old email link for an account that has since been deleted must not create the record again
// (bug round 49). A deleted account gets no email anyway, so that case still shows the done page.
async function optOut(uid: string): Promise<boolean> {
  try {
    await db().collection("users").doc(uid).update({ emailOptOut: true, emailOptOutAt: new Date() });
  } catch (e) {
    if ((e as { code?: unknown })?.code !== 5) throw e;   // 5 is NOT_FOUND
  }
  return true;
}

const shell = (body: string, status: number) => new NextResponse(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Replysis emails</title>
<body style="font-family:system-ui,sans-serif;background:#0b0b10;color:#e6e6ea;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="max-width:420px;padding:24px;text-align:center">${body}</div></body>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

const page = (ok: boolean) => shell(
  `<h1 style="font-size:20px">${ok ? "You will not get these emails again" : "This link did not work"}</h1>
<p style="color:#9a9aa5">${ok ? "Your Replysis account is unchanged." : "Write to us from replysis.com and we will remove you by hand."}</p>`,
  ok ? 200 : 400);

// Opening the link only asks; the button does it. Mail scanners (Outlook Safe Links and company filters) open every
// link in an email before the person does, so a link that unsubscribed on opening took people off the list who never
// asked (bug round 49). Mail apps that offer their own unsubscribe button send a POST, which still works in one step.
export async function GET(req: Request) {
  const uid = linkUid(req);
  if (!uid) return page(false);
  const url = new URL(req.url);
  const action = `/api/unsubscribe?u=${encodeURIComponent(uid)}&t=${encodeURIComponent(url.searchParams.get("t") || "")}`;
  return shell(
    `<h1 style="font-size:20px">Stop Replysis emails?</h1>
<p style="color:#9a9aa5">Your Replysis account stays as it is.</p>
<form method="post" action="${action}"><button type="submit" style="margin-top:12px;padding:10px 18px;border-radius:8px;border:0;background:#e6e6ea;color:#0b0b10;font-size:15px;cursor:pointer">Stop these emails</button></form>`,
    200);
}

export async function POST(req: Request) {
  const uid = linkUid(req);
  if (!uid) return page(false);
  return page(await optOut(uid).catch(() => false));
}
