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
for (const f of ["lastActive", "lastLogin", "lastExit", "lastLoginAt", "lastEntry", "loginCount", "totalMinutesSpent"]) assert.ok(fields.includes(f), `${f} stays writable`);
// Round 59: fields no app writes (loginHistory, location, appDownloads) could fill a record to its size limit, and a
// future time showed someone as online for ever. Only the listed fields, and each changed time is checked.
for (const f of ["loginHistory", "location", "appDownloads", "mayaTasteSteps", "mayaTalkCount", "voiceChars"]) assert.ok(!fields.includes(f), `the client must not be able to write ${f}`);
for (const t of ["lastLogin", "lastLoginAt", "lastEntry", "lastActive", "lastExit"]) assert.ok(update.includes(`moment('${t}')`), `${t} must be checked as a real time`);
assert.match(users, /is timestamp/);
assert.match(users, /request\.time \+ duration\.value\(1, 'd'\)/);
// The browser no longer writes the login history list.
const layout = readFileSync(new URL("../app/client-layout.tsx", import.meta.url), "utf8");
assert.ok(!/loginHistory/.test(layout), "client-layout.tsx must not write loginHistory");

console.log("firestore rules ok");
