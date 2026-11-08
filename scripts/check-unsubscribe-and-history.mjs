// Bug round 49 (2026-11-07).
// 1. Opening an unsubscribe link must not unsubscribe: mail scanners open every link first. Only POST may opt out.
// 2. The opt out must update, never set with merge, so an old link cannot bring back a deleted account's record.
// 3. Past interviews must keep the newest 50, not 50 in Firestore's random id order.
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const fail = (m) => { console.error(m); process.exit(1); };

const unsub = read("app/api/unsubscribe/route.ts");
const getStart = unsub.indexOf("export async function GET");
const postStart = unsub.indexOf("export async function POST");
if (getStart < 0 || postStart < 0) fail("app/api/unsubscribe/route.ts: GET and POST handlers must both exist");
const getBody = unsub.slice(getStart, postStart > getStart ? postStart : undefined);
if (/optOut\(|\.update\(|\.set\(/.test(getBody)) fail("app/api/unsubscribe/route.ts: GET must only ask, never opt out");
if (!/method="post"/.test(getBody)) fail("app/api/unsubscribe/route.ts: GET must offer a button that posts");
if (!/optOut\(/.test(unsub.slice(postStart))) fail("app/api/unsubscribe/route.ts: POST must opt out");
if (/\.set\(\s*\{\s*emailOptOut/.test(unsub)) fail("app/api/unsubscribe/route.ts: opting out must use update, not set");
if (!/\.update\(\s*\{\s*emailOptOut/.test(unsub)) fail("app/api/unsubscribe/route.ts: opting out must update the record");

const sessions = read("app/api/sessions/route.ts");
const shown = Number(/SESSIONS_SHOWN\s*=\s*(\d+)/.exec(sessions)?.[1]);
const readN = Number(/SESSIONS_READ\s*=\s*(\d+)/.exec(sessions)?.[1]);
if (!(readN > shown)) fail("app/api/sessions/route.ts: must read more interviews than it shows");
if (!/\.sort\([^)]*\)[^;]*\.slice\(0,\s*SESSIONS_SHOWN\)/s.test(sessions)) fail("app/api/sessions/route.ts: must sort newest first, then keep SESSIONS_SHOWN");
if (/\.limit\(50\)/.test(sessions)) fail("app/api/sessions/route.ts: a plain limit(50) drops the newest interviews");

console.log("unsubscribe and interview history ok");
