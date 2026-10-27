// app/api/credits/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { isPaidPlan, mayaAccess } from "../../lib/paid-plan";
import { FREE_TASTES_PER_DAY } from "../../../data/mayaAddon";

export const dynamic = "force-dynamic";

function getDb() {
  if (getApps().length) return getFirestore();

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("Firebase env vars missing");
    return null;
  }

  try {
    // Try to parse as full JSON service account (new format)
    try {
      const decoded = Buffer.from(privateKeyInput, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (parsed.private_key) {
        initializeApp({
          credential: cert(parsed),
        });
        return getFirestore();
      }
    } catch (e) {
      // Not JSON, fall through to raw key handling
    }

    // Old format - raw private key string
    let formattedKey = privateKeyInput;
    if (!formattedKey.includes("-----BEGIN")) {
      formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
    }
    formattedKey = formattedKey.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });

    return getFirestore();
  } catch (e) {
    console.error("Firebase Admin init error:", e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let uid: string;
    try {
      uid = (await getAuth().verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snap = await db.collection("users").doc(uid).get();

    if (!snap.exists) {
      return NextResponse.json({ credits: 0, plan: "free", paid: false, maya: "free" });
    }

    const data = snap.data()!;
    const maya = mayaAccess(data);
    // The free interviews of the day are shared by everyone; when they are taken, say so before anyone starts.
    let tasteFull = false;
    if (maya.state === "taste") {
      const today = await db.collection("avatar_usage").doc(`free_${new Date().toISOString().slice(0, 10)}`).get()
        .then((d) => Number(d.data()?.sessions ?? 0)).catch(() => 0);
      tasteFull = today >= FREE_TASTES_PER_DAY;
    }
    return NextResponse.json({
      credits: data.credits ?? 0,
      plan: data.plan ?? "free",
      // A trial account is on Pro but has paid nothing, so it is not paid.
      paid: isPaidPlan(data),
      // The mock interview with Maya: "ok", "free" (needs a plan) or "no_addon" (needs the Maya add-on).
      maya: tasteFull ? "taste_full" : maya.state,
      mayaMonthly: maya.monthly,
      mayaPass: maya.pass,
    });
  } catch (err: any) {
    console.error("Credits GET error:", err);
    return NextResponse.json({ credits: 0, plan: "free" });
  }
}
