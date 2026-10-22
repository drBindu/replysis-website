import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { validUnsubscribe } from "../../lib/user-mail";

export const dynamic = "force-dynamic";

function db() {
  if (!getApps().length) {
    let key = process.env.FIREBASE_PRIVATE_KEY || "";
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }) });
  }
  return getFirestore();
}

async function optOut(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const uid = url.searchParams.get("u") || "";
  const t = url.searchParams.get("t") || "";
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid) || !validUnsubscribe(uid, t)) return false;
  await db().collection("users").doc(uid).set({ emailOptOut: true, emailOptOutAt: new Date() }, { merge: true });
  return true;
}

const page = (ok: boolean) => new NextResponse(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Replysis emails</title>
<body style="font-family:system-ui,sans-serif;background:#0b0b10;color:#e6e6ea;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:20px">${ok ? "You will not get these emails again" : "This link did not work"}</h1>
<p style="color:#9a9aa5">${ok ? "Your Replysis account is unchanged." : "Write to us from replysis.com and we will remove you by hand."}</p></div></body>`,
  { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });

export async function GET(req: Request) { return page(await optOut(req).catch(() => false)); }
export async function POST(req: Request) { return page(await optOut(req).catch(() => false)); }
