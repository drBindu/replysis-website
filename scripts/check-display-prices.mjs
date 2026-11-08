// Every price a visitor sees must be in the currency the checkout charges them (bug round 43, 2026-11-07).
// The pricing table's Maya row said "Add for $10/month" to India (charged Rs 399), the UK (GBP 7.99), Canada and
// Australia, and the home page's plan facts said $34.99 and $79.99 to everyone. Both now come from
// app/lib/display-prices.ts, which reads the same /api/geo answer as the rest of the pricing page.
//
// Live Stripe prices read on 2026-11-07 (read only), which these constants must keep matching:
//   Pro  USD 34.99  INR 699   GBP 27.99  CAD 47.99   AUD 52.99
//   Max  USD 79.99  INR 1299  GBP 62.99  CAD 109.99  AUD 119.99
//   Maya USD 10     INR 399   GBP 7.99   CAD 13.99   AUD 14.99
//   Practice USD 14.99 INR 499 GBP 11.99 CAD 19.99   AUD 21.99
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const fail = (msg) => { console.error(msg); process.exit(1); };

const LIVE = {
  pro: { usd: 34.99, inr: 699, gbp: 27.99, cad: 47.99, aud: 52.99 },
  max: { usd: 79.99, inr: 1299, gbp: 62.99, cad: 109.99, aud: 119.99 },
  maya: { usd: 10, inr: 399, gbp: 7.99, cad: 13.99, aud: 14.99 },
  practice: { usd: 14.99, inr: 499, gbp: 11.99, cad: 19.99, aud: 21.99 },
};

const helper = read("app/lib/display-prices.ts");
const num = (re) => { const m = helper.match(re); return m ? Number(m[1]) : NaN; };
if (num(/PLAN_USD = \{ pro: ([\d.]+)/) !== LIVE.pro.usd || num(/PLAN_USD = \{ pro: [\d.]+, max: ([\d.]+)/) !== LIVE.max.usd)
  fail("app/lib/display-prices.ts: PLAN_USD must match the live dollar prices");
if (num(/PLAN_INR = \{ pro: ([\d.]+)/) !== LIVE.pro.inr || num(/PLAN_INR = \{ pro: [\d.]+, max: ([\d.]+)/) !== LIVE.max.inr)
  fail("app/lib/display-prices.ts: PLAN_INR must match the live rupee prices");

const local = read("data/localPrices.ts");
for (const [code, cur] of [["GB", "gbp"], ["CA", "cad"], ["AU", "aud"]]) {
  const m = local.match(new RegExp(`${code}: \\{[^}]*pro: ([\\d.]+), max: ([\\d.]+)`));
  if (!m || Number(m[1]) !== LIVE.pro[cur] || Number(m[2]) !== LIVE.max[cur]) fail(`data/localPrices.ts: ${code} must match the live ${cur} prices`);
}

const maya = read("data/mayaAddon.ts");
const block = (name) => maya.slice(maya.indexOf(`export const ${name}`), maya.indexOf("};", maya.indexOf(`export const ${name}`)));
for (const [name, live] of [["MAYA_ADDON", LIVE.maya], ["MOCK_PLAN", LIVE.practice]]) {
  const b = block(name);
  const get = (re) => { const m = b.match(re); return m ? Number(m[1]) : NaN; };
  if (get(/usd: ([\d.]+)/) !== live.usd || get(/inr: ([\d.]+)/) !== live.inr
    || get(/gbp: ([\d.]+)/) !== live.gbp || get(/cad: ([\d.]+)/) !== live.cad || get(/aud: ([\d.]+)/) !== live.aud)
    fail(`data/mayaAddon.ts: ${name} must match the live prices`);
}

const pricing = read("app/pricing/page.tsx");
if (!/monthlyPrice: PLAN_USD\.pro/.test(pricing) || !/monthlyPrice: PLAN_USD\.max/.test(pricing)
  || !/inrMonthly: PLAN_INR\.pro/.test(pricing) || !/inrMonthly: PLAN_INR\.max/.test(pricing))
  fail("app/pricing/page.tsx: plan prices must come from app/lib/display-prices.ts");
if (!/row\.label === MAYA_ROW_LABEL \? \{ \.\.\.row, pro: `Add for \$\{addonPrice\}/.test(pricing))
  fail("app/pricing/page.tsx: the comparison table's Maya row must show the add-on in the visitor's currency");

const home = read("components/home/v2/Sections.tsx");
if (/\$34\.99|\$79\.99|\$\{MOCK_PLAN\.usd\}/.test(home) || !/shownPrices\(/.test(home))
  fail("components/home/v2/Sections.tsx: plan prices must come from shownPrices, not dollar literals");

console.log("display prices ok");
