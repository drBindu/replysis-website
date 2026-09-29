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
//   3. Every number that exists twice is equal.
//   4. The worst case for every paid plan is a profit, after fees.
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

// ---------- extraction ----------------------------------------------------------
const stripTsComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** { free: 100, pro: 2000 } from a TypeScript object literal. */
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

/** The same from a Java Map.of("free", 100, ...). */
function javaMap(text, name) {
  if (!text) return null;
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const at = clean.indexOf(name);
  if (at < 0) return null;
  const open = clean.indexOf("Map.of(", at);
  const close = clean.indexOf(");", open);
  const out = {};
  for (const m of clean.slice(open, close).matchAll(/"(\w+)"\s*,\s*([\d_]+)/g)) out[m[1]] = num(m[2]);
  return out;
}

const same = (a, b) => a && b && JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const show = (o) => JSON.stringify(o);

// ---------- sources -------------------------------------------------------------
const java = read(resolve(BACK, "src/main/java/com/replysis/backend/service/FirestoreCreditsService.java"));
const facts = read(resolve(FRONT, "data/productFacts.ts"));
const tokens = read(resolve(FRONT, "app/api/stt/tokens/route.ts"));
const usage = read(resolve(FRONT, "app/api/usage/listening/route.ts"));
const useCredits = read(resolve(FRONT, "app/lib/use-credits.ts"));
const realInterview = read(resolve(FRONT, "app/real-interview/page.tsx"));
const pricing = read(resolve(FRONT, "app/pricing/page.tsx"));
const winMain = read(resolve(WIN, "MainWindow.xaml.cs"));
const winCredits = read(resolve(WIN, "CreditsWindow.xaml.cs"));

if (!java) warn("backend repo not found next to the website; server numbers were NOT checked");
const importsFacts = (t) => !!t && /PLAN_MONTHLY_CREDITS\s+as\s+\w+\s*}\s*from\s*"[^"]*productFacts"/.test(t);
if (!winMain) warn("Windows repo not found; app numbers were NOT checked");

// ---------- 1. credits per plan -------------------------------------------------
console.log("\nCredits per plan");
const jCredits = javaMap(java, "PLAN_MONTHLY_CREDITS");
const fCredits = tsMap(facts, "PLAN_MONTHLY_CREDITS");
const tCredits = tsMap(tokens, "PLAN_MONTHLY_CREDITS");
if (fCredits) ok(`website facts: ${show(fCredits)}`); else bad("could not read PLAN_MONTHLY_CREDITS from productFacts.ts");
if (jCredits) (same(jCredits, fCredits) ? ok : bad)(`server (Java) equals website facts${same(jCredits, fCredits) ? "" : ": " + show(jCredits)}`);
if (importsFacts(tokens)) ok("token route reads the website facts directly, so it cannot differ");
else if (tCredits) (same(tCredits, fCredits) ? ok : bad)(`token route equals website facts${same(tCredits, fCredits) ? "" : ": " + show(tCredits)}`);
else bad("could not read the token route's credits map");

// ---------- 2. answer cost ------------------------------------------------------
console.log("\nWhat one answer costs");
const jCost = java ? num((java.match(/INTERVIEW_QUESTION_COST\s*=\s*(\d+)/) || [])[1]) : null;
const fCost = facts ? num((facts.match(/realtime_per_minute:\s*(\d+)/) || [])[1]) : null;
const wCost = winMain ? num((winMain.match(/AnswerCreditCost\s*=\s*(\d+)/) || [])[1]) : null;
console.log(`        server ${jCost}, website ${fCost}, Windows app ${wCost}`);
for (const [n, v] of [["server", jCost], ["Windows app", wCost]])
  if (v != null && !Number.isNaN(v)) (v === fCost ? ok : bad)(`${n} charges the same as the website (${v} vs ${fCost})`);
const freeAnswers = fCredits && fCost ? Math.floor(fCredits.free / fCost) : null;
if (freeAnswers) ok(`a free account is ${fCredits.free} credits = ${freeAnswers} answers`);

// ---------- 3. the hidden fair use limit (minutes of speech) --------------------
console.log("\nFair use limit on listening (never shown to customers)");
const jAudio = javaMap(java, "PLAN_MONTHLY_AUDIO_MINUTES");
const fAudio = tsMap(facts, "PLAN_MONTHLY_AUDIO_MINUTES");
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

// ---------- 5. the Windows credits window mirrors the plans ---------------------
console.log("\nWindows app copy");
if (winCredits && fCredits) {
  const fmt = (n) => n.toLocaleString("en-US");
  const wants = { pro: fmt(fCredits.pro), max: fmt(fCredits.max), free: fmt(fCredits.free) };
  for (const [plan, want] of Object.entries(wants))
    (winCredits.includes(`"${want} each month"`) ? ok : bad)(`credits window says ${want} for ${plan}`);
}

// ---------- 6. profit: the worst case of every plan -----------------------------
console.log("\nProfit, worst case per plan (every credit used as an answer AND the whole fair use limit spent)");
const STT_PER_MIN = 0.462 / 60;       // Deepgram nova-3, priced at the conservative pay as you go rate
const ANSWER = 0.001;                 // one generated answer
const priceOf = (id) => {
  const block = pricing && pricing.slice(pricing.indexOf(`id: "${id}"`));
  const m = block && block.match(/monthlyPrice:\s*([\d.]+)/);
  const a = block && block.match(/annualPrice:\s*([\d.]+)/);
  return m ? { monthly: Number(m[1]), annual: Number(a?.[1] ?? m[1]) } : null;
};
const MIN_MARGIN = 0.5;
const rows = [];
for (const plan of ["free", "pro", "max"]) {
  if (!fCredits || !fAudio) break;
  const price = priceOf(plan);
  const answers = Math.floor(fCredits[plan] / (fCost || 5));
  const cost = fAudio[plan] * STT_PER_MIN + answers * ANSWER;
  if (plan === "free") {
    rows.push(`  ${plan.padEnd(5)} costs at most $${cost.toFixed(2)} per user a month (${answers} answers + ${fAudio[plan]} min of speech), revenue $0`);
    continue;
  }
  if (!price) { warn(`no price found for ${plan}`); continue; }
  for (const [label, p] of [["monthly", price.monthly], ["annual", price.annual]]) {
    const fee = label === "monthly" ? 0.029 * p + 0.30 : (0.029 * p * 12 + 0.30) / 12;
    const profit = p - fee - cost;
    const margin = profit / p;
    rows.push(`  ${plan.padEnd(5)} ${label.padEnd(7)} price $${p.toFixed(2)}  cost $${cost.toFixed(2)}  fees $${fee.toFixed(2)}  profit $${profit.toFixed(2)}  (${Math.round(margin * 100)}%)`);
    (margin >= MIN_MARGIN ? ok : bad)(`${plan} ${label} keeps at least ${MIN_MARGIN * 100}% margin in the worst case`);
  }
}
rows.forEach((r) => console.log(r));

console.log(`\n${failures === 0 ? "ALL IN SYNC" : `${failures} PROBLEM(S)`}${warnings ? `, ${warnings} warning(s)` : ""}`);
process.exit(failures === 0 ? 0 : 1);
