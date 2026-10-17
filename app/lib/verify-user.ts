import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/** Firebase Admin, started once from the server's environment. Returns false when it is not configured. */
export function ensureAdmin(): boolean {
  if (getApps().length) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyInput) return false;
  try {
    let key = privateKeyInput;
    if (!key.includes("-----BEGIN")) key = Buffer.from(key, "base64").toString("utf8");
    key = key.replace(/^"/, "").replace(/"$/, "").replace(/\\n/g, "\n").trim();
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  } catch (e) {
    console.error("[auth] Firebase Admin init error:", (e as Error)?.name ?? "Error");
  }
  return getApps().length > 0;
}

/** The signed-in user's id from the Bearer token, or null. */
export async function verifiedUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !ensureAdmin()) return null;
  try { return (await getAuth().verifyIdToken(token)).uid; } catch { return null; }
}
