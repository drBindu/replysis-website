// The listening counter is zeroed once per passed reset date, not on every report (bug round 50).
// Before, a person who only listened and never asked for an answer kept the counter at one report's minutes, so the
// hidden fair use guard never applied. The same rule lives in the backend's FirestoreCreditsService.listeningPeriod.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../app/lib/listening-period.ts", import.meta.url), "utf8");
const js = src.replace(/export function/, "function").replace(/: number \| null/, "").replace(/\((resetAt): number, (storedPeriod): unknown, (now): number\)/, "($1, $2, $3)");
const listeningPeriod = new Function(`${js}; return listeningPeriod;`)();

const reset = Date.parse("2026-12-01T00:00:00Z");
const fail = (m) => { console.error("listening period: " + m); process.exit(1); };
if (listeningPeriod(reset, undefined, reset - 1) !== null) fail("zeroed before the reset date");
if (listeningPeriod(reset, undefined, reset + 1) !== reset) fail("not zeroed once the reset date passed");
if (listeningPeriod(reset, reset, reset + 60_000) !== null) fail("zeroed again for the same reset date");
if (listeningPeriod(reset, reset - 1, reset + 1) !== reset) fail("old period kept after a new reset date passed");
if (listeningPeriod(0, undefined, Date.now()) !== null) fail("zeroed with no reset date");

const route = readFileSync(new URL("../app/api/usage/listening/route.ts", import.meta.url), "utf8");
if (!route.includes("listeningPeriod(") || !route.includes("audioMinutesPeriodMs")) fail("route no longer uses the rule");

// The speech key gate must use the same rule (round 57): it used to allow everyone once the reset date had passed, so a
// listen only account was never limited on the website even after the reports started counting again.
const tokens = readFileSync(new URL("../app/api/stt/tokens/route.ts", import.meta.url), "utf8");
const gate = tokens.slice(tokens.indexOf("async function hasAudioTimeLeft"), tokens.indexOf("const UNLIMITED_EMAILS"));
if (!gate.includes("listeningPeriod(") || !gate.includes("audioMinutesPeriodMs")) fail("speech key gate does not use the rule");
if (/Date\.now\(\) >= resetAt\) return true/.test(gate)) fail("speech key gate still allows everyone after the reset date");
console.log("listening counter zeroed once per reset ok");
