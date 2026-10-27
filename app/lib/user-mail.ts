// Email to customers (update news), sent through Resend with the key the backend's alerts already use (ALERTS_RESEND_KEY).
// Every message carries a one-click unsubscribe link; people who used it are never emailed again.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const FROM = process.env.MAIL_FROM || "Replysis <hello@replysis.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://replysis.com";

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || createHash("sha256").update(String(process.env.FIREBASE_PRIVATE_KEY || "")).digest("hex");
}

export function unsubscribeToken(uid: string): string {
  return createHmac("sha256", secret()).update("unsub:" + uid).digest("hex").slice(0, 32);
}

export function validUnsubscribe(uid: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(uid));
  const got = Buffer.from(String(token || ""));
  return want.length === got.length && timingSafeEqual(want, got);
}

export function unsubscribeLink(uid: string): string {
  return `${SITE}/api/unsubscribe?u=${encodeURIComponent(uid)}&t=${unsubscribeToken(uid)}`;
}

export const mailConfigured = () => Boolean(process.env.ALERTS_RESEND_KEY);

export type Mail = { to: string; uid: string; subject: string; text: string };

/** Sends in batches of 100 (Resend's batch limit). Returns how many were accepted. */
export async function sendMails(mails: Mail[]): Promise<{ sent: number; failed: number; error?: string }> {
  const key = process.env.ALERTS_RESEND_KEY;
  if (!key) return { sent: 0, failed: mails.length, error: "No email key on the server yet" };
  let sent = 0, failed = 0, error: string | undefined;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100).map((m) => {
      const unsub = unsubscribeLink(m.uid);
      return {
        from: FROM, to: [m.to], subject: m.subject,
        text: `${m.text}\n\nYou get this because you have a Replysis account. Stop these emails: ${unsub}\n`,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      };
    });
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else { failed += chunk.length; error = `Mail service said ${res.status}: ${(await res.text()).slice(0, 200)}`; }
    } catch (e) {
      failed += chunk.length; error = (e as Error)?.message ?? "send failed";
    }
  }
  return { sent, failed, error };
}

/** An email to the owner (ALERTS_TO, else support@), without the customer unsubscribe line. Never throws. */
export async function sendOwnerAlert(subject: string, text: string): Promise<void> {
  const key = process.env.ALERTS_RESEND_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [process.env.ALERTS_TO || "support@replysis.com"], subject, text }),
    });
  } catch { /* an alert must never break a payment */ }
}
