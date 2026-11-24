// One receipt layout for every payment: the email a customer gets after paying and the copy the admin downloads.
// Shared by the server (webhook, admin API) and the admin page, so it imports nothing server only.

export type ReceiptRow = {
  number: string;          // receipt number shown to the customer
  uid: string;
  email: string | null;
  name?: string | null;
  item: string;            // what was bought, in plain words
  amount: number;          // smallest unit (cents, paise) as Stripe sends it
  currency: string;        // lower case, as Stripe sends it
  paidAt: number;          // ms
  source: string;          // where the receipt came from (subscription, month, minutes, pack, practice, maya)
};

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export function receiptMoney(amount: number, currency: string): string {
  const c = (currency || "usd").toLowerCase();
  const value = ZERO_DECIMAL.has(c) ? amount : amount / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c.toUpperCase() }).format(value);
  } catch {
    return `${value.toFixed(2)} ${c.toUpperCase()}`;
  }
}

const PLAN_NAMES: Record<string, string> = { pro: "Pro", max: "Max", teams: "Teams", lifetime: "Lifetime", practice: "Practice" };

/** What a receipt document in plan_passes, minute_purchases or subscription_payments was for, in plain words. */
export function receiptItem(collection: string, id: string, d: Record<string, unknown>): string {
  if (collection === "minute_purchases") return `${Number(d.minutes) || 0} interview minutes`;
  if (collection === "subscription_payments") {
    const plan = PLAN_NAMES[String(d.plan ?? "")] ?? "Replysis";
    return d.reason === "subscription_cycle" ? `${plan} plan, monthly renewal` : `${plan} plan, monthly`;
  }
  if (id.startsWith("pack_")) return `${Number(d.credits) || 0} credits answer pack`;
  if (id.startsWith("maya_") || d.kind === "maya") return "Mock interview with Maya";
  if (id.startsWith("mock_") || d.kind === "practice") return "Practice plan, one month";
  const plan = PLAN_NAMES[String(d.plan ?? "")];
  return plan ? `${plan} plan, one month` : "Replysis purchase";
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const dateText = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** Plain text receipt for the email's text part. */
export function receiptText(r: ReceiptRow): string {
  return [
    `Receipt from Replysis`,
    ``,
    `Receipt number: ${r.number}`,
    `Date paid: ${dateText(r.paidAt)}`,
    `Paid by: ${r.email ?? ""}`,
    ``,
    `${r.item}: ${receiptMoney(r.amount, r.currency)}`,
    `Total paid: ${receiptMoney(r.amount, r.currency)}`,
    ``,
    `Thank you for using Replysis. Questions about this payment: support@replysis.com`,
    `Varoxel LLC, replysis.com`,
  ].join("\n");
}

/** A complete, printable receipt page. Used as the email body and as the admin's download. */
export function receiptHtml(r: ReceiptRow): string {
  const total = esc(receiptMoney(r.amount, r.currency));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Replysis receipt ${esc(r.number)}</title>
<style>
  body{margin:0;background:#F4F1EA;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1F1E1B}
  .wrap{max-width:560px;margin:0 auto;padding:32px 16px}
  .card{background:#FBFAF6;border:1px solid #E3DED3;border-radius:16px;padding:32px}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#7A756A;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:15px}
  td{padding:10px 0;border-bottom:1px solid #ECE8DF}
  td.r{text-align:right}
  .total td{font-weight:600;border-bottom:none;padding-top:16px}
  .meta{margin-top:20px;font-size:14px;line-height:1.7}
  .foot{margin-top:24px;font-size:13px;color:#7A756A;line-height:1.6}
  @media print{body{background:#fff}.card{border:none}}
</style></head><body><div class="wrap"><div class="card">
  <h1>Receipt from Replysis</h1>
  <div class="muted">Thank you for your payment.</div>
  <div class="meta">
    <div><span class="muted">Receipt number</span><br>${esc(r.number)}</div>
    <div><span class="muted">Date paid</span><br>${esc(dateText(r.paidAt))}</div>
    <div><span class="muted">Paid by</span><br>${esc(r.name ? `${r.name}, ${r.email ?? ""}` : r.email ?? "")}</div>
  </div>
  <table>
    <tr><td>${esc(r.item)}</td><td class="r">${total}</td></tr>
    <tr class="total"><td>Total paid</td><td class="r">${total}</td></tr>
  </table>
  <div class="foot">Questions about this payment: support@replysis.com<br>Varoxel LLC, replysis.com</div>
</div></div></body></html>`;
}

/** A short receipt number from a Stripe id or receipt document id. */
export function receiptNumber(id: string): string {
  const core = id.replace(/^(cs_live_|cs_test_|in_|pack_|maya_|mock_)/, "").replace(/[^A-Za-z0-9]/g, "");
  return `RX-${core.slice(-10).toUpperCase()}`;
}
