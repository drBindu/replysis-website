// One mock interview with Maya has started: it counts as one of the month's interviews (owner, 2026-10-26: "start
// interview, one off, not sessions"). Called once when the interview begins, with the interview's own id, so a retry
// of the same call never counts twice. Internal accounts are not counted.

import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit } from "../../../lib/rate-limit";
import { verifiedUid } from "../../../lib/verify-user";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`simli-begin:${uid}`, 30, 60 * 60_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id.slice(0, 64) : "";
  if (!id) return NextResponse.json({ error: "Missing interview id" }, { status: 400 });

  const db = getFirestore();
  const user = await db.collection("users").doc(uid).get().then((d) => d.data()).catch(() => undefined);
  if (user?.internal === true) return NextResponse.json({ ok: true });
  const month = new Date().toISOString().slice(0, 7);
  const monthRef = db.collection("avatar_usage").doc(`${uid}_${month}`);
  await db.runTransaction(async (tx) => {
    const d = (await tx.get(monthRef)).data() ?? {};
    const ids: string[] = Array.isArray(d.ids) ? d.ids : [];
    if (ids.includes(id)) return;
    tx.set(monthRef, { uid, month, interviews: Number(d.interviews ?? 0) + 1, ids: [...ids, id].slice(-50),
                       updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }).catch((e) => console.error("[simli] begin count failed:", (e as Error)?.name ?? "Error"));
  return NextResponse.json({ ok: true });
}
