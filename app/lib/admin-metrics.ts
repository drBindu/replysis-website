// The owner's admin numbers (round 29, 2026-11-07). Kept free of Firestore so scripts/check-admin-metrics.mjs can run them.

export type PlanCounts = {
  paid: number;          // plan in pro, max, lifetime, teams (trials included, they sit on pro)
  pro: number;
  max: number;
  trial: number;         // planSource "trial"
  internal: number;
  internalPaid: number;  // internal and on a paid plan (trials included)
  internalPro: number;
  internalMax: number;
  internalTrial: number; // internal and on the trial
  passPro?: number;      // India months paid once: paying, but their money is in the rupee sales, not a subscription
  passMax?: number;
  internalPassPro?: number;  // the owner's own accounts among them: already left out of realPro and realMax
  internalPassMax?: number;
};

/**
 * Customers who pay, without trials and without the owner's own accounts. A trial that is also internal is in both
 * internalPaid and trial; taking both off counted it twice and showed one paying customer fewer.
 */
export function realPlanCounts(c: PlanCounts) {
  const externalTrial = Math.max(0, c.trial - c.internalTrial);
  const realPro = Math.max(0, c.pro - c.internalPro - externalTrial);
  const realMax = Math.max(0, c.max - c.internalMax);
  return {
    realPaid: Math.max(0, c.paid - c.internalPaid - externalTrial),
    realPro,
    realMax,
    // Subscriptions only, for the monthly revenue: an India month was priced at the dollar Pro price and its rupees
    // were added again from the sales, so one customer counted twice.
    // Only outside India months come off: the internal ones were never in realPro or realMax (round 57).
    subPro: Math.max(0, realPro - Math.max(0, (c.passPro ?? 0) - (c.internalPassPro ?? 0))),
    subMax: Math.max(0, realMax - Math.max(0, (c.passMax ?? 0) - (c.internalPassMax ?? 0))),
  };
}

export type Receipt = {
  id: string; uid?: unknown; amount?: unknown; currency?: unknown; minutes?: unknown; createdAt?: unknown; nothingRunning?: unknown;
};

/**
 * India money in, from the receipt collections (plan_passes and minute_purchases). plan_passes also holds answer pack
 * receipts in dollars and refund receipts with no amount: a dollar pack was added as rupees, and a refund was counted as a
 * purchase. Only rupee receipts with an amount count; refunds are counted on their own.
 */
export function indiaSales(receipts: Receipt[], ms: (v: unknown) => number | null, now = Date.now()) {
  const perUser = new Map<string, { inr: number; minutes: number; count: number; last: number }>();
  let totalInr = 0;
  let last30Inr = 0;
  let refunds = 0;
  for (const r of receipts) {
    // A refund receipt marks a charge taken back; one with nothing running took nothing back.
    if (r.id.startsWith("refund_")) { if (r.nothingRunning !== true) refunds += 1; continue; }
    if (typeof r.uid !== "string") continue;
    const currency = typeof r.currency === "string" ? r.currency.toLowerCase() : "inr";
    const amount = Number(r.amount);
    if (currency !== "inr" || !Number.isFinite(amount) || amount <= 0) continue;
    const inr = amount / 100;
    totalInr += inr;
    const at = ms(r.createdAt) ?? 0;
    if (at > now - 30 * 86_400_000) last30Inr += inr;
    const cur = perUser.get(r.uid) ?? { inr: 0, minutes: 0, count: 0, last: 0 };
    cur.inr += inr; cur.minutes += Number(r.minutes) || 0; cur.count += 1;
    cur.last = Math.max(cur.last, at);
    perUser.set(r.uid, cur);
  }
  // last30Inr is what belongs in a monthly revenue figure; totalInr is all time.
  return { perUser, totalInr, last30Inr, refunds };
}

// Stripe amounts are in the smallest unit (cents, paise); these currencies have none.
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export type Money = Record<string, number>;

/**
 * Money in, in every currency, from every receipt: subscription payments, India months, minutes, packs. Refund receipts and
 * receipts without an amount are skipped. The admin showed rupees only, so a $34.99 Pro sale was invisible (2026-11-24).
 */
export function moneyIn(receipts: Receipt[], ms: (v: unknown) => number | null, now = Date.now()) {
  const allTime: Money = {};
  const last30: Money = {};
  const perUser = new Map<string, Money>();
  const add = (m: Money, c: string, v: number) => { m[c] = (m[c] ?? 0) + v; };
  for (const r of receipts) {
    if (r.id.startsWith("refund_") || typeof r.uid !== "string") continue;
    const amount = Number(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const currency = typeof r.currency === "string" && r.currency ? r.currency.toLowerCase() : "inr";
    const value = ZERO_DECIMAL.has(currency) ? amount : amount / 100;
    add(allTime, currency, value);
    if ((ms(r.createdAt) ?? 0) > now - 30 * 86_400_000) add(last30, currency, value);
    const mine = perUser.get(r.uid) ?? {};
    add(mine, currency, value);
    perUser.set(r.uid, mine);
  }
  return { allTime, last30, perUser };
}

/** "$34.99 + ₹699" for any mix of currencies; "" when there is none. */
export function formatMoney(m: Money | null | undefined): string {
  if (!m) return "";
  return Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([c, v]) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: c.toUpperCase(),
        maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }).format(v);
    } catch { return `${v.toFixed(2)} ${c.toUpperCase()}`; }
  }).join(" + ");
}

/**
 * What a plan set by hand writes. A trial account given a plan by the owner kept planSource "trial", so the trial job
 * put it back to free a day later and the panel counted it as a trial, not as paying.
 */
export function manualPlanFields(currentPlanSource: unknown, plan: string, credits: number): Record<string, unknown> {
  const fields: Record<string, unknown> = { plan, credits };
  if (currentPlanSource === "trial") fields.planSource = "admin";
  return fields;
}
