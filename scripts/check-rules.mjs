// Checks that a browser can never write its own balance or plan. Run: node scripts/check-rules.mjs
// The live rules once let a client create its own user record with any extra field (minutesBalance, mockPlan) and change
// creditsUsed on an existing one. Proved on the emulator 2026-11-07 (round 24); these lines stop that coming back.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
const users = rules.slice(rules.indexOf("match /users/{uid}"), rules.indexOf("match /app_downloads"));
assert.ok(users.length > 0, "users block found");

assert.match(users, /allow create:\s*if false;/, "only the server creates user records");
assert.match(users, /allow delete:\s*if false;/);

const update = users.slice(users.indexOf("allow update"), users.indexOf("allow delete"));
const listed = update.match(/hasOnly\(\[([^\]]*)\]\)/)?.[1] ?? "";
const fields = listed.split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean);
const serverOnly = ["credits", "creditsUsed", "purchasedCredits", "minutesBalance", "audioMinutesUsed", "audioMinutesAllowance",
  "plan", "planSource", "passExpiresAt", "creditsResetDate", "mockPlan", "mockPlanUntil", "mayaAddon", "mayaAddonUntil",
  "internal", "tester", "stripeCustomerId", "stripeSubscriptionId"];
for (const f of serverOnly) assert.ok(!fields.includes(f), `the client must not be able to write ${f}`);
// What the website, Windows and Mac apps write themselves.
for (const f of ["lastActive", "lastLogin", "lastExit", "totalMinutesSpent", "loginHistory"]) assert.ok(fields.includes(f), `${f} stays writable`);

console.log("firestore rules ok");
