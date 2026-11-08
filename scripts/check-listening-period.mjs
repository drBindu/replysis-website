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
console.log("listening counter zeroed once per reset ok");
