// Checks which customer emails the hourly timer may send (round 27, 2026-11-07).
// Run: node --experimental-strip-types scripts/check-email-plan.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CUSTOMER_EMAIL_GAP_MS, customerEmailKeys, emailedRecently, mayaTasteDue, onePerPerson } from "../app/lib/email-plan.ts";

const now = Date.parse("2026-11-07T12:00:00Z");
const hour = 3600_000;

// Never two emails within 12 hours, whatever the kind; missing or zero dates do not count.
assert.equal(CUSTOMER_EMAIL_GAP_MS, 12 * hour);
assert.equal(emailedRecently([now - 35 * 60_000], now), true, "35 minutes after the trial reminder is too soon");
assert.equal(emailedRecently([0, undefined, null, NaN, now - 13 * hour], now), false);
assert.deepEqual(customerEmailKeys("u1"), ["followup-u1", "upgrade-maya-taste-u1", "upgrade-out-of-answers-u1", "trial-reminder-u1"]);

// The Maya nudge: one hour to seven days after the free interview, never to a paying customer or one who has Maya.
assert.equal(mayaTasteDue(false, false, now - 2 * hour, now), true);
assert.equal(mayaTasteDue(true, false, now - 2 * hour, now), false, "a paying Pro customer is not sold the Practice plan");
assert.equal(mayaTasteDue(false, true, now - 2 * hour, now), false);
assert.equal(mayaTasteDue(false, false, now - 30 * 60_000, now), false);
assert.equal(mayaTasteDue(false, false, now - 8 * 24 * hour, now), false);
assert.equal(mayaTasteDue(false, false, null, now), false);

// One upgrade email per person per run, and out of answers wins whichever order they come in.
const picked = onePerPerson([
  { uid: "a", kind: "maya-taste" }, { uid: "a", kind: "out-of-answers" },
  { uid: "b", kind: "out-of-answers" }, { uid: "b", kind: "maya-taste" },
  { uid: "c", kind: "maya-taste" },
]);
assert.deepEqual(picked.map((p) => `${p.uid}:${p.kind}`).sort(), ["a:out-of-answers", "b:out-of-answers", "c:maya-taste"]);

// The route uses all of it, and gives a claim back when the send fails so the next hour tries again.
const route = readFileSync(new URL("../app/api/internal/followups/route.ts", import.meta.url), "utf8");
assert.ok(route.includes("onePerPerson(pending)"), "upgrade emails go one per person");
assert.ok((route.match(/emailedRecently\(/g) ?? []).length >= 2, "follow-up and upgrade emails both wait 12 hours");
assert.ok(route.includes("mayaTasteDue(isPaidPlan(d)"), "the Maya nudge skips paying customers");
assert.ok((route.match(/\.delete\(\)\.catch/g) ?? []).length >= 2, "a failed send gives its claim back");

console.log("email plan ok");
