// The refresh date shown to a paid customer (bug round 38, 2026-11-07). A monthly subscription refreshes on its renewal
// day; creditsResetDate sits three days later as a safety margin and must not be shown for it.
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../app/lib/refresh-date.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { refreshShownDate } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const now = Date.parse("2026-11-20T00:00:00Z");
const renewal = Date.parse("2026-12-15T10:00:00Z") / 1000;
const margin = "2026-12-18T10:00:00.000Z";
const cases = [
  ["monthly subscription shows its renewal day",
    { stripeSubscriptionId: "sub_1", stripeBillingInterval: "monthly", stripeCurrentPeriodEnd: renewal, creditsResetDate: margin }, renewal],
  ["annual plan keeps the monthly refill date",
    { stripeSubscriptionId: "sub_1", stripeBillingInterval: "annual", stripeCurrentPeriodEnd: renewal, creditsResetDate: "2026-12-01T00:00:00.000Z" }, "2026-12-01T00:00:00.000Z"],
  ["no subscription uses the stored date",
    { stripeSubscriptionId: null, stripeBillingInterval: "monthly", stripeCurrentPeriodEnd: renewal, creditsResetDate: margin }, margin],
  ["a period end already past falls back",
    { stripeSubscriptionId: "sub_1", stripeBillingInterval: "monthly", stripeCurrentPeriodEnd: Date.parse("2026-11-01T00:00:00Z") / 1000, creditsResetDate: margin }, margin],
  ["missing profile", null, undefined],
];
let failed = 0;
for (const [name, profile, want] of cases) {
  const got = refreshShownDate(profile, now);
  if (got !== want) { failed++; console.error(`FAIL ${name}: got ${got}, want ${want}`); }
}
if (failed) process.exit(1);
console.log("refresh date shown ok");
