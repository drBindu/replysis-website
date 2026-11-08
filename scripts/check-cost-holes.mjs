// Round 59 (2026-11-07): the cost and free-answer holes an attacker review found. Run:
// node --experimental-strip-types scripts/check-cost-holes.mjs
// Each rule is checked against the real code (paid-plan.ts and email-plan.ts are imported and run); the route wiring,
// which needs Firebase to run, is checked by reading the source.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

// paid-plan.ts imports "../../data/mayaAddon" with no extension, as the site's bundler allows; node needs ".ts" added.
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) { if (spec.startsWith(".") && !/\\.(ts|js|mjs|json)$/.test(spec)) return next(spec + ".ts", ctx); throw e; }
}`));
const { DAILY_TALK_WITHOUT_MAYA, DAILY_VOICE_CHARS_WITH_MAYA, DAILY_VOICE_CHARS_WITHOUT_MAYA, TASTE_STEPS_MAX, hasMaya,
  mockConversationAllowed, mockStepsFree, usedToday } = await import("../app/lib/paid-plan.ts");
const { safeFirstName } = await import("../app/lib/email-plan.ts");

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// 1 and 2. The one free interview has a size; a plan with Maya ignores it.
assert.equal(mockStepsFree({ plan: "free" }), true, "an unused free interview starts free");
assert.equal(mockStepsFree({ plan: "free", mayaTasteSteps: TASTE_STEPS_MAX - 1 }), true);
assert.equal(mockStepsFree({ plan: "free", mayaTasteSteps: TASTE_STEPS_MAX }), false, "the free interview ends when its steps are used");
assert.equal(mockStepsFree({ plan: "max", mayaTasteSteps: 999 }), true, "Max includes Maya whatever the count");
assert.equal(mockStepsFree({ plan: "free", mockPlan: true, mayaTasteSteps: 999 }), true, "Practice whatever the count");
// Without the free interview or answers, Maya's conversation is closed; with 5 answers left it is allowed but counted.
assert.equal(mockConversationAllowed({ plan: "free", mayaTasteSteps: TASTE_STEPS_MAX, credits: 0 }), false);
assert.equal(mockConversationAllowed({ plan: "free", mayaTasteSteps: TASTE_STEPS_MAX, credits: 5 }), true);
assert.equal(hasMaya({ plan: "max" }), true);
assert.equal(hasMaya({ plan: "free", internal: true }), true, "the owner's accounts are never counted");
assert.equal(hasMaya({ plan: "free", credits: 50 }), false);
assert.ok(DAILY_TALK_WITHOUT_MAYA >= 40 && DAILY_TALK_WITHOUT_MAYA <= 120);
assert.equal(usedToday("2026-11-07", 12, "2026-11-07"), 12);
assert.equal(usedToday("2026-11-06", 12, "2026-11-07"), 0, "yesterday's count does not carry over");

const tokens = read("../app/api/stt/tokens/route.ts");
assert.match(tokens, /usedToday\(data\.mayaTalkDay, data\.mayaTalkCount, today\)/, "the conversation is counted per day without Maya");
assert.match(tokens, /used >= DAILY_TALK_WITHOUT_MAYA/);
assert.match(tokens, /mayaTasteSteps: FieldValue\.increment\(1\)/, "a free interview step is counted");
assert.match(tokens, /snap && !snap\.exists\) return \{ allowed: false/, "no account record, no conversation");

// The backend keeps the same count and number.
const java = read("../../backend/src/main/java/com/replysis/backend/controller/QuestionController.java");
assert.match(java, new RegExp(`TASTE_STEPS_MAX = ${TASTE_STEPS_MAX};`), "the backend's free interview size matches the website");
assert.match(java, /"mayaTasteSteps"/);

// 4. Maya's voice: no account record means no voice, and a day's characters are capped.
const tts = read("../app/api/tts/route.ts");
assert.match(tts, /if \(!snap\.exists\) return false;/);
assert.match(tts, /DAILY_VOICE_CHARS_WITH_MAYA : DAILY_VOICE_CHARS_WITHOUT_MAYA/);
assert.ok(DAILY_VOICE_CHARS_WITHOUT_MAYA < DAILY_VOICE_CHARS_WITH_MAYA && DAILY_VOICE_CHARS_WITH_MAYA <= 100_000);
assert.ok(tts.indexOf("voiceAllowed(uid, text.length)") > tts.indexOf("text.length > MAX_CHARS"), "the text is measured before it is allowed");

// 7. A free interview claim needs a face that joined today and one claim a day per address.
const begin = read("../app/api/simli/begin/route.ts");
assert.match(begin, /joinedToday < 1/);
assert.match(begin, /simli-begin-free-ip:/);

// 9. Emails greet by a plain first name only, and go only to proved addresses.
assert.equal(safeFirstName("Priya Sharma"), "Priya");
assert.equal(safeFirstName("User"), "");
assert.equal(safeFirstName("https://evil.example now"), "", "a link is never a name");
assert.equal(safeFirstName("www.evil.com"), "");
assert.equal(safeFirstName("a@b.com"), "");
assert.equal(safeFirstName("José"), "José");
assert.equal(safeFirstName("O'Neil"), "O'Neil");
const followups = read("../app/api/internal/followups/route.ts");
assert.equal((followups.match(/await emailVerified\(doc\.id\)/g) ?? []).length, 2, "both email loops skip unproved addresses");
assert.ok(!/displayName \?\? ""\)\.trim\(\)\.split/.test(followups), "no email builds a greeting from the raw name");
assert.match(read("../app/api/start-link/route.ts"), /if \(!verified\) return/);

console.log("cost holes closed ok");

// 5. A rupee checkout paid with a card from outside India is reported to the owner, never refunded automatically.
const webhook = read("../app/api/stripe/webhook/route.ts");
assert.match(webhook, /void reportForeignCardOnRupees\(event\.data\.object\)/, "rupee checkouts are checked, without holding up the grant");
assert.match(webhook, /country && country !== "IN" \? country : null/);
assert.ok(!/refunds/.test(webhook.slice(webhook.indexOf("async function reportForeignCardOnRupees"), webhook.indexOf("function foreignCardCountry"))),
  "the card check never refunds by itself");
console.log("rupee card check ok");
