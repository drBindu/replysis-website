#!/usr/bin/env node
// Checks that the server, the website and the Windows app agree, and that no
// plan can lose money. Run it before every release of any of the three:
//
//   node scripts/check-sync.mjs
//
// It exists because the same limit lived in seven files and the app, the
// server and the website drifted apart. A Free user saw "55 credits, 0m left",
// spoke to a silent app, and reasonably decided it was broken (2026-09-29).
// The rules it enforces are the owner's:
//   1. Credits are the ONLY meter a customer sees. No minutes, no hours.
//   2. One answer costs the same everywhere.
//   3. Every number that exists twice is equal, and equal to what was agreed.
//   4. The worst case for every paid plan is a profit, after fees.
//   5. The ladder makes sense: a bigger thing costs more, and each step is
//      cheaper per answer, so nobody is better off buying the smaller thing.
//   6. Free is a one time trial, never refilled, and every place that resets a
//      balance goes through the one rule for it.
//
// Sibling repos are found by relative path (uiii/backend, windowsNative). One
// that is not there is skipped with a warning, never silently passed.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FRONT = resolve(here, "..");
const BACK = resolve(FRONT, "..", "backend");
const WIN = resolve(FRONT, "..", "..", "windowsNative");

let failures = 0, warnings = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const warn = (m) => { warnings++; console.log(`  warn  ${m}`); };
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const num = (s) => Number(String(s).replace(/_/g, ""));

// What the owner agreed on 2026-09-29. Changing a plan means editing this block ON PURPOSE,
// which is the point: a number moved in one file alone fails here instead of reaching a customer.
const AGREED = {
  answerCost: 5,
  credits: { free: 25, pro: 2500, max: 7500 },           // 5 answers once, 500 a month, 1,500 a month
  monthlyUsd: { pro: 34.99, max: 79.99 },
  fuseMinutes: { free: 15, pro: 900, max: 1800 },        // hidden fair use guard, in minutes of speech
};

// ---------- extraction ----------------------------------------------------------
const stripTsComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** { free: 25, pro: 2500 } from a TypeScript object literal. */
function tsMap(text, name) {
  if (!text) return null;
  const clean = stripTsComments(text);
  const at = clean.search(new RegExp(`\\b${name}\\b[^=]*=`));
  if (at < 0) return null;
  const open = clean.indexOf("{", at);
  let depth = 0, end = open;
  for (let i = open; i < clean.length; i++) {
    if (clean[i] === "{") depth++;
    if (clean[i] === "}" && --depth === 0) { end = i; break; }
  }
  const out = {};
  for (const m of clean.slice(open + 1, end).matchAll(/\b(\w+)\s*:\s*([\d_]+)\b/g)) out[m[1]] = num(m[2]);
  return out;
}

/** The same from a Java Map.of("free", 25, ...); a name such as FREE_TRIAL_CREDITS is looked up. */
function javaMap(text, name) {
  if (!text) return null;
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const consts = {};
  for (const m of clean.matchAll(/\b(?:static\s+)?final\s+int\s+(\w+)\s*=\s*([\d_]+)\s*;/g)) consts[m[1]] = num(m[2]);
  const at = clean.indexOf(name);
  if (at < 0) return null;
  const open = clean.indexOf("Map.of(", at);
  const close = clean.indexOf(");", open);
  const out = {};
  for (const m of clean.slice(open, close).matchAll(/"(\w+)"\s*,\s*([\w_]+)/g)) {
    const v = /^[\d_]+$/.test(m[2]) ? num(m[2]) : consts[m[2]];
    if (v !== undefined) out[m[1]] = v;
  }
  return out;
}

const same = (a, b) => a && b && JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const show = (o) => JSON.stringify(o);

// ---------- sources -------------------------------------------------------------
const java = read(resolve(BACK, "src/main/java/com/replysis/backend/service/FirestoreCreditsService.java"));
const facts = read(resolve(FRONT, "data/productFacts.ts"));
const packsSrc = read(resolve(FRONT, "data/creditPacks.ts"));
const tokens = read(resolve(FRONT, "app/api/stt/tokens/route.ts"));
const usage = read(resolve(FRONT, "app/api/usage/listening/route.ts"));
const deduct = read(resolve(FRONT, "app/api/credits/deduct/route.ts"));
const libCredits = read(resolve(FRONT, "app/lib/credits.ts"));
const useCredits = read(resolve(FRONT, "app/lib/use-credits.ts"));
const realInterview = read(resolve(FRONT, "app/real-interview/page.tsx"));
const pricing = read(resolve(FRONT, "app/pricing/page.tsx"));
const winMain = read(resolve(WIN, "MainWindow.xaml.cs"));
const winCredits = read(resolve(WIN, "CreditsWindow.xaml.cs"));
const winPlan = read(resolve(WIN, "PlanFacts.cs"));

if (!java) warn("backend repo not found next to the website; server numbers were NOT checked");
const importsFacts = (t) => !!t && /PLAN_MONTHLY_CREDITS\s+as\s+\w+\b[^}]*}\s*from\s*"[^"]*productFacts"/.test(t);
if (!winMain) warn("Windows repo not found; app numbers were NOT checked");

// ---------- 1. credits per plan -------------------------------------------------
console.log("\nCredits per plan");
const jCredits = javaMap(java, "PLAN_MONTHLY_CREDITS");
const fCredits = tsMap(facts, "PLAN_MONTHLY_CREDITS");
const tCredits = tsMap(tokens, "PLAN_MONTHLY_CREDITS");
if (fCredits) ok(`website facts: ${show(fCredits)}`); else bad("could not read PLAN_MONTHLY_CREDITS from productFacts.ts");
if (fCredits) for (const plan of ["free", "pro", "max"])
  (fCredits[plan] === AGREED.credits[plan] ? ok : bad)(`${plan} is ${AGREED.credits[plan]} credits, as agreed (website has ${fCredits[plan]})`);
if (jCredits) (same(jCredits, fCredits) ? ok : bad)(`server (Java) equals website facts${same(jCredits, fCredits) ? "" : ": " + show(jCredits)}`);
if (importsFacts(tokens)) ok("token route reads the website facts directly, so it cannot differ");
else if (tCredits) (same(tCredits, fCredits) ? ok : bad)(`token route equals website facts${same(tCredits, fCredits) ? "" : ": " + show(tCredits)}`);
else bad("could not read the token route's credits map");
if (winPlan && fCredits) {
  const w = {};
  for (const m of winPlan.matchAll(/const int (Free|Pro|Max|Teams)Credits\s*=\s*([\d_]+)/g)) w[m[1].toLowerCase()] = num(m[2]);
  for (const plan of ["free", "pro", "max", "teams"])
    (w[plan] === fCredits[plan] ? ok : bad)(`Windows app (PlanFacts.cs) ${plan} equals website facts (${w[plan]} vs ${fCredits[plan]})`);
}
const jGuest = java ? num((java.match(/GUEST_FREE_CREDITS\s*=\s*([\w_]+)\s*;/) || [])[1] === "FREE_TRIAL_CREDITS"
  ? (java.match(/FREE_TRIAL_CREDITS\s*=\s*([\d_]+)/) || [])[1] : (java.match(/GUEST_FREE_CREDITS\s*=\s*([\d_]+)/) || [])[1]) : null;
if (jGuest) (jGuest === fCredits?.free ? ok : bad)(`a guest gets the same free answers as a free account (${jGuest} vs ${fCredits?.free})`);

// India: a rupee subscriber gets the same credits, with their own (smaller) hidden guard.
const india = tsMap(facts, "INDIA_PLAN_ALLOWANCE");
{
  const block = facts && stripTsComments(facts).match(/INDIA_PLAN_ALLOWANCE\s*=\s*\{([\s\S]*?)\}\s*as const/);
  const cr = block && [...block[1].matchAll(/(pro|max):\s*\{\s*credits:\s*([\d_]+)/g)].reduce((a, m) => (a[m[1]] = num(m[2]), a), {});
  if (cr && fCredits) for (const p of ["pro", "max"])
    (cr[p] === fCredits[p] ? ok : bad)(`India ${p} credits equal the dollar plan (${cr[p]} vs ${fCredits[p]}), so a renewal cannot hand out a different amount`);
}

// ---------- 2. answer cost ------------------------------------------------------
console.log("\nWhat one answer costs");
const jCost = java ? num((java.match(/INTERVIEW_QUESTION_COST\s*=\s*(\d+)/) || [])[1]) : null;
const fCost = facts ? num((facts.match(/realtime_per_minute:\s*(\d+)/) || [])[1]) : null;
const wCostRaw = winMain ? num((winMain.match(/AnswerCreditCost\s*=\s*(\d+)/) || [])[1]) : null;
const wCost = Number.isNaN(wCostRaw) ? null : wCostRaw;   // MainWindow takes it from PlanFacts now
const wPlanCost = winPlan ? num((winPlan.match(/AnswerCost\s*=\s*(\d+)/) || [])[1]) : null;
console.log(`        server ${jCost}, website ${fCost}, Windows app ${wCost ?? wPlanCost}`);
(fCost === AGREED.answerCost ? ok : bad)(`an answer is ${AGREED.answerCost} credits, as agreed (website has ${fCost})`);
for (const [n, v] of [["server", jCost], ["Windows app", wPlanCost]])
  if (v != null && !Number.isNaN(v)) (v === fCost ? ok : bad)(`${n} charges the same as the website (${v} vs ${fCost})`);
if (winMain && wCost == null) ok("Windows MainWindow takes its answer price from PlanFacts");
const freeAnswers = fCredits && fCost ? Math.floor(fCredits.free / fCost) : null;
if (freeAnswers) ok(`a free account is ${fCredits.free} credits = ${freeAnswers} answers, once`);
const startCost = facts ? num((facts.match(/live_transcription_start:\s*(\d+)/) || [])[1]) : null;
(startCost === 0 ? ok : bad)(`starting a live session on the website is free (${startCost}), so 25 credits really are 5 answers`);

// ---------- 3. the hidden fair use limit (minutes of speech) --------------------
console.log("\nFair use limit on listening (never shown to customers)");
const jAudio = javaMap(java, "PLAN_MONTHLY_AUDIO_MINUTES");
const fAudio = tsMap(facts, "PLAN_MONTHLY_AUDIO_MINUTES");
for (const plan of ["free", "pro", "max"])
  if (fAudio) (fAudio[plan] === AGREED.fuseMinutes[plan] ? ok : bad)(`${plan} guard is ${AGREED.fuseMinutes[plan]} minutes of speech, as agreed (website has ${fAudio[plan]})`);
for (const [n, t] of [["token route", tsMap(tokens, "PLAN_MONTHLY_AUDIO_MINUTES")],
                      ["usage route", tsMap(usage, "PLAN_MONTHLY_AUDIO_MINUTES")],
                      ["use-credits hook", tsMap(useCredits, "PLAN_MONTHLY_AUDIO_MINUTES")]])
  if (t) (same(t, fAudio) ? ok : bad)(`${n} equals website facts${same(t, fAudio) ? "" : ": " + show(t)}`);
if (jAudio) (same(jAudio, fAudio) ? ok : bad)(`server (Java) equals website facts${same(jAudio, fAudio) ? "" : ": " + show(jAudio)}`);
const inline = realInterview && (realInterview.match(/\{\s*free:\s*([\d_]+),\s*pro:\s*([\d_]+),\s*max:\s*([\d_]+)/) || null);
if (inline && fAudio) (num(inline[1]) === fAudio.free && num(inline[2]) === fAudio.pro && num(inline[3]) === fAudio.max ? ok : bad)("real-interview page copy equals website facts");
const guest = java ? num((java.match(/GUEST_FREE_AUDIO_MINUTES\s*=\s*(\d+)/) || [])[1]) : null;
if (guest && fAudio) (guest <= fAudio.free ? ok : bad)(`a guest (${guest}) never gets more than a signed-in free user (${fAudio.free})`);

// ---------- 4. customers see credits only ---------------------------------------
console.log("\nCustomers see credits only");
const commentLine = /^\s*(\/\/|\*|\/\*|\/\/\/|#)/;
function scan(label, text, extra = () => true) {
  if (!text) return;
  const lines = text.split(/\r?\n/);
  // A message that is only written to the debug log is not shown to anyone.
  const logOnly = (i) => lines.slice(Math.max(0, i - 3), i + 1).some((l) => /DebugWindow\.Log\(|CLog\(|console\.(log|warn|error)/.test(l));
  const hits = lines.map((l, i) => [i + 1, l])
    .filter(([n, l]) => !commentLine.test(l) && extra(l) && !logOnly(n - 1) &&
      /listening/i.test(l) && /\b(minutes?|hours?|mins?)\b|\bmin left\b|\d+\s*h\b/i.test(l));
  hits.length === 0 ? ok(`${label}: no listening minutes or hours shown`)
                    : hits.forEach(([n, l]) => bad(`${label}:${n} shows listening time: ${l.trim().slice(0, 110)}`));
}
scan("pricing page", pricing);
scan("website facts", facts);
scan("real-interview page", realInterview);
scan("Windows main window", winMain, (l) => /"/.test(l) && !/DebugWindow|CLog|Log\(/.test(l));
scan("Windows credits window", winCredits);

// ---------- 4b. no place still says the old numbers ---------------------------------
console.log("\nNo old plan numbers left in customer text");
{
  // Each is something that used to be true. Comments are skipped: history may name them.
  const OLD = [
    [/\b100 (free |monthly |AI )?credits\b|100 credits (a|each|per) month|100 each month|"100 free/i, "the old 100 free credits a month"],
    [/\b2,000 (monthly |free )?credits\b|"2,000 each month|2,000 credits (a|each|per|refresh)/i, "Pro at 2,000 credits"],
    [/\b5,000 (monthly )?credits (a|each|per) month|5,000 each month|5,000 monthly credits/i, "Max at 5,000 credits a month"],
    [/\$29\.99/, "the old Pro price $29.99"],
    [/\$49\.99/, "the old Max price $49.99"],
    [/\b(20|twenty) (free )?(answers|questions)\b/i, "the old 20 free answers"],
    [/2\.5[x×] (Pro|the monthly)/i, "the old 2.5x Pro capacity"],
  ];
  const files = [
    ["pricing page", pricing], ["website facts", stripTsComments(facts || "")],
    ["Windows credits window", winCredits], ["Windows main window", winMain], ["Windows PlanFacts", winPlan],
  ];
  const others = ["components/CreditsBadge.tsx", "components/CreditUpgradeNotice.tsx", "components/Footer.tsx", "components/AuthModal.tsx",
    "components/FirstRunGuide.tsx", "components/home/MidSections.tsx", "components/home/HeroSection.tsx", "app/account/page.tsx",
    "app/resume/page.tsx", "app/real-interview/page.tsx", "app/mock-interview/page.tsx", "app/admin/page.tsx", "app/lib/credits.ts"];
  for (const f of others) files.push([f, read(resolve(FRONT, f))]);
  const winFiles = ["LoginWindow.xaml", "CreditsWindow.xaml", "SettingsWindow.xaml.cs"];
  for (const f of winFiles) files.push([`Windows ${f}`, read(resolve(WIN, f))]);
  let stale = 0;
  for (const [label, text] of files) {
    if (!text) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      if (commentLine.test(line)) return;
      for (const [re, what] of OLD)
        if (re.test(line)) { stale++; bad(`${label}:${i + 1} still says ${what}: ${line.trim().slice(0, 100)}`); }
    });
  }
  if (!stale) ok("no customer text still names the old numbers or prices");
}

// ---------- 5. the Windows credits window states the plans ----------------------
console.log("\nWindows app copy");
if (winCredits && winPlan) {
  (/PlanFacts\.AllowanceText/.test(winCredits) ? ok : bad)("credits window takes its allowance line from PlanFacts");
  (/Not refreshed/.test(winCredits) ? ok : bad)("credits window does not promise a refresh date for the free answers");
}

// ---------- 5b. what the table promises free users is true in the app -------------
console.log("\nPricing table promises match the Windows app");
const winStealth = read(resolve(WIN, "WindowStealth.cs"));
const winSettings = read(resolve(WIN, "SettingsWindow.xaml.cs"));
const tableSaysFreeStealth = /label: "Desktop capture exclusion",\s+free: (true|"Included")/.test(pricing || "");
const tableSaysFreeApp = /label: "Windows desktop app",\s+free: true/.test(pricing || "");
if (winStealth && winSettings) {
  const gated = /\b(UserSession\.Plan|IsPaid|isPaid)\b/.test(winStealth) ||
                /StealthMode[^\n]*\b(UserSession\.Plan|IsPaid)\b/.test(winSettings);
  if (tableSaysFreeStealth) (!gated ? ok : bad)("table says free users get capture exclusion, and the app does not gate it by plan");
  else if (gated) ok("table says capture exclusion is paid, and the app gates it");
  else bad("table says capture exclusion is paid, but the app does not gate it by plan");
  (tableSaysFreeApp ? ok : bad)("table says free users get the Windows app, which the website gives them");
}

// ---------- 5c. the ladder: Free < Small < Medium < Pro < Large < Max ----------------
console.log("\nThe ladder (packs and plans)");
const packs = [];
if (packsSrc) for (const m of stripTsComments(packsSrc).matchAll(/\{\s*id:\s*"(\d+)",\s*credits:\s*(\d+),\s*price:\s*([\d.]+)/g))
  packs.push({ name: `${m[2]}-credit pack`, credits: num(m[2]), price: Number(m[3]) });
const priceIn = (id) => {
  const block = pricing && pricing.slice(pricing.indexOf(`id: "${id}"`));
  const m = block && block.match(/monthlyPrice:\s*([\d.]+)/);
  const a = block && block.match(/annualPrice:\s*([\d.]+)/);
  return m ? { monthly: Number(m[1]), annual: Number(a?.[1] ?? m[1]) } : null;
};
const proPrice = priceIn("pro"), maxPrice = priceIn("max");
for (const [plan, p] of [["pro", proPrice], ["max", maxPrice]])
  if (p) (p.monthly === AGREED.monthlyUsd[plan] ? ok : bad)(`${plan} costs $${AGREED.monthlyUsd[plan]} a month, as agreed (pricing page has $${p.monthly})`);
if (packs.length === 3 && proPrice && maxPrice && fCredits) {
  const [small, medium, large] = packs.sort((a, b) => a.credits - b.credits);
  const rung = [
    { name: "Free trial", credits: fCredits.free, price: 0 },
    small, medium,
    { name: "Pro (a month)", credits: fCredits.pro, price: proPrice.monthly },
    large,
    { name: "Max (a month)", credits: fCredits.max, price: maxPrice.monthly },
  ];
  for (let i = 1; i < rung.length; i++) {
    (rung[i].credits > rung[i - 1].credits ? ok : bad)(`${rung[i].name} (${rung[i].credits / fCost} answers) is bigger than ${rung[i - 1].name} (${rung[i - 1].credits / fCost})`);
    (rung[i].price > rung[i - 1].price ? ok : bad)(`${rung[i].name} ($${rung[i].price}) costs more than ${rung[i - 1].name} ($${rung[i - 1].price})`);
  }
  const perAnswer = (r) => r.price / (r.credits / fCost);
  for (let i = 2; i < rung.length; i++)
    // Within a tenth of a cent counts as the same: Pro ($34.99 for 500) and the Large pack ($69.99 for
    // 1,000) are deliberately level at 7 cents an answer, and 1 cent apart in the fifth decimal is not
    // a reason to fail a release.
    (perAnswer(rung[i]) <= perAnswer(rung[i - 1]) + 0.001 ? ok : bad)(
      `${rung[i].name} is no dearer per answer ($${perAnswer(rung[i]).toFixed(3)}) than ${rung[i - 1].name} ($${perAnswer(rung[i - 1]).toFixed(3)}): more buys cheaper answers, so nobody is better off with the smaller thing`);
  (packs.every((p, i) => i === 0 || p.credits > packs[i - 1].credits) ? ok : bad)("the packs are unchanged in size order");
} else warn("could not read the packs or the plan prices; the ladder was NOT checked");

// ---------- 5d. yearly plans are hidden ------------------------------------------------
console.log("\nYearly plans");
(/const ANNUAL_ENABLED = false;/.test(pricing || "") ? ok : bad)("yearly plans are hidden on the pricing page (owner, 2026-09-29)");
const yearlyOn = /const ANNUAL_ENABLED = true;/.test(pricing || "");

// ---------- 5e. the reset rule has one home -------------------------------------------
console.log("\nFree is one time, and every reset uses the same rule");
(/export function creditsAfterMonthlyReset/.test(facts || "") ? ok : bad)("the website has one reset rule (creditsAfterMonthlyReset)");
for (const [n, t] of [["credits library", libCredits], ["deduct route", deduct], ["token route", tokens]])
  if (t) {
    (/creditsAfterMonthlyReset\(/.test(t) ? ok : bad)(`${n} resets through the shared rule`);
    (!/credits\s*=\s*(?:cap|plan\.totalCredits)\s*\+\s*purchasedCredits\s*;/.test(stripTsComments(t)) ? ok : bad)(`${n} has no private copy of the old "refill to the cap" rule`);
  }
if (java) {
  (/static long creditsAfterReset\(/.test(java) ? ok : bad)("the server has one reset rule (creditsAfterReset)");
  (!/monthlyCredits\(plan\)\s*\+\s*readLong/.test(java) ? ok : bad)("the server has no private copy of the old refill rule");
  // A refill would be the assignment INSIDE the "month rolled over" branch. Setting a brand new guest up
  // with their five answers is not a refill and is fine.
  const noComments = java.replace(/\/\/.*$/gm, "");
  const guestRefill = /(?:isBefore\(resetAt\)\)|resetAt == null \|\| resetNeeded\))\s*\{\s*credits\s*=\s*GUEST_FREE_CREDITS/.test(noComments);
  (!guestRefill ? ok : bad)("a guest's free answers are never refilled when the month rolls over");
}

// ---------- 6. profit: the worst case of every plan -----------------------------
console.log("\nProfit, worst case per plan (every credit used as an answer AND the whole fair use limit spent)");
const STT_PER_MIN = 0.462 / 60;       // Deepgram nova-3, priced at the conservative pay as you go rate
const ANSWER = 0.001;                 // one generated answer
const MIN_MARGIN = 0.5;
const rows = [];
for (const plan of ["free", "pro", "max"]) {
  if (!fCredits || !fAudio) break;
  const answers = Math.floor(fCredits[plan] / (fCost || 5));
  const cost = fAudio[plan] * STT_PER_MIN + answers * ANSWER;
  if (plan === "free") {
    rows.push(`  ${plan.padEnd(5)} costs at most $${cost.toFixed(2)} per person, ONCE (${answers} answers + ${fAudio[plan]} min of speech), revenue $0`);
    (cost <= 0.15 ? ok : bad)(`a free person costs at most 15 cents in the worst case, and only once (${(cost * 100).toFixed(1)} cents)`);
    continue;
  }
  const price = plan === "pro" ? proPrice : maxPrice;
  if (!price) { warn(`no price found for ${plan}`); continue; }
  const periods = yearlyOn ? [["monthly", price.monthly], ["annual", price.annual]] : [["monthly", price.monthly]];
  for (const [label, p] of periods) {
    const fee = label === "monthly" ? 0.029 * p + 0.30 : (0.029 * p * 12 + 0.30) / 12;
    const profit = p - fee - cost;
    const margin = profit / p;
    rows.push(`  ${plan.padEnd(5)} ${label.padEnd(7)} price $${p.toFixed(2)}  cost $${cost.toFixed(2)}  fees $${fee.toFixed(2)}  profit $${profit.toFixed(2)}  (${Math.round(margin * 100)}%)`);
    (margin >= MIN_MARGIN ? ok : bad)(`${plan} ${label} keeps at least ${MIN_MARGIN * 100}% margin in the worst case`);
  }
  // What a normal customer costs: all their answers, and speech only for the questions.
  const typical = answers * (ANSWER + 20 * (STT_PER_MIN / 60));
  rows.push(`        a customer who uses every answer costs about $${typical.toFixed(2)} (${(typical / price.monthly * 100).toFixed(0)}% of the price)`);
}
// India: the rupee price, at about Rs 85 to the dollar and a 3.5% gateway fee.
{
  const RUPEE = 85;
  const inr = { pro: 699, max: 1299 };
  const audioIndia = { pro: 360, max: 720 };
  for (const plan of ["pro", "max"]) {
    if (!fCredits) break;
    const answers = Math.floor(fCredits[plan] / (fCost || 5));
    const revenue = inr[plan] / RUPEE;
    const cost = audioIndia[plan] * STT_PER_MIN + answers * ANSWER + 0.035 * revenue;
    const margin = (revenue - cost) / revenue;
    rows.push(`  ${plan.padEnd(5)} India   price Rs ${inr[plan]} ($${revenue.toFixed(2)})  worst-case cost $${cost.toFixed(2)}  margin ${Math.round(margin * 100)}%`);
    (margin >= MIN_MARGIN ? ok : bad)(`${plan} in India (Rs ${inr[plan]}) keeps at least ${MIN_MARGIN * 100}% margin in the worst case`);
  }
}
rows.forEach((r) => console.log(r));

console.log(`\n${failures === 0 ? "ALL IN SYNC" : `${failures} PROBLEM(S)`}${warnings ? `, ${warnings} warning(s)` : ""}`);
process.exit(failures === 0 ? 0 : 1);
