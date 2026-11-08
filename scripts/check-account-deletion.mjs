// Checks what deleting an account does besides removing the record (round 31, 2026-11-07).
// Run: node --experimental-strip-types scripts/check-account-deletion.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cancelChargingSubscriptions, chargingSubscriptionIds, pendingDeletionRequests } from "../app/lib/account-deletion.ts";

// Every subscription that still charges is cancelled; ended ones are left alone.
assert.deepEqual(chargingSubscriptionIds([
  { id: "sub_pro", status: "active" }, { id: "sub_practice", status: "trialing" }, { id: "sub_late", status: "past_due" },
  { id: "sub_old", status: "canceled" }, { id: "sub_gone", status: "incomplete_expired" }, { status: "active" },
]), ["sub_pro", "sub_practice", "sub_late"]);

const calls = [];
const fake = (lists, failCancel = false) => async (url, init = {}) => {
  calls.push(`${init.method ?? "GET"} ${url}`);
  if ((init.method ?? "GET") === "GET") return { ok: true, status: 200, json: async () => ({ data: lists }) };
  return { ok: !failCancel, status: failCancel ? 500 : 200, json: async () => ({}) };
};
const cancelled = await cancelChargingSubscriptions("cus_1", "sk_test_x", fake([{ id: "sub_pro", status: "active" }, { id: "sub_old", status: "canceled" }]));
assert.deepEqual(cancelled, ["sub_pro"]);
assert.ok(calls.includes("DELETE https://api.stripe.com/v1/subscriptions/sub_pro"));
assert.ok(!calls.some((c) => c.includes("sub_old") && c.startsWith("DELETE")));
assert.deepEqual(await cancelChargingSubscriptions("", "sk_test_x", fake([])), [], "no customer, nothing to cancel");
await assert.rejects(cancelChargingSubscriptions("cus_1", "sk_test_x", fake([{ id: "sub_pro", status: "active" }], true)), /cancel failed/,
  "a failed cancel stops the deletion");
await assert.rejects(cancelChargingSubscriptions("cus_1", "", fake([])), /not configured/);

// Only requests still waiting show, oldest first; dismissed (the Apple reviewer account) and completed ones never do.
const now = Date.parse("2026-11-07T12:00:00Z");
const rows = pendingDeletionRequests([
  { id: "a", data: { status: "requested", email: "a@x.com", requestedAt: "2026-11-05T12:00:00Z" } },
  { id: "b", data: { status: "dismissed", email: "reviewer@x.com", requestedAt: "2026-11-04T02:10:27Z" } },
  { id: "c", data: { status: "completed", requestedAt: "2026-10-01T00:00:00Z" } },
  { id: "d", data: { status: "requested", email: "d@x.com", requestedAt: { toMillis: () => now - 10 * 86_400_000 } } },
], now);
assert.deepEqual(rows.map((r) => [r.uid, r.daysWaiting]), [["d", 10], ["a", 2]]);

// The wiring: deletion cancels Stripe before anything is removed, scrubs emails from problem reports and billing rows,
// closes the request, and a late "subscription ended" event does not bring the record back.
const admin = readFileSync(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
const del = admin.slice(admin.indexOf('if (action === "deleteUser")'));
assert.ok(del.indexOf("cancelChargingSubscriptions") < del.indexOf("deleteBackendResumes"), "Stripe is cancelled first");
assert.ok(del.includes('"client_errors", "user"'));
assert.ok(del.includes('clearFieldWhere(db, "usage_events", "identityId"'));
assert.ok(del.includes('status: "completed"'));
assert.ok(admin.includes("deletionRequests: pendingDeletionRequests("));
const webhook = readFileSync(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
const end = webhook.slice(webhook.indexOf("async function endSubscription"), webhook.indexOf("async function endSubscription") + 600);
assert.ok(end.includes("if (!snap.exists)"), "a deleted account is not recreated by a late Stripe event");
// The check outside the write is not enough: the account can be deleted in between, so the write itself checks too, and
// Practice ending checks as well (round 57).
const endWhole = webhook.slice(webhook.indexOf("async function endSubscription"), webhook.indexOf("function getInvoiceSubscriptionId"));
assert.ok(/applyUserUpdate\([\s\S]*\}, true\);/.test(endWhole), "ending a subscription writes only to an existing record");
const update = webhook.slice(webhook.indexOf("async function applyUserUpdate"), webhook.indexOf("async function applyActiveSubscription"));
assert.ok(update.includes("if (onlyIfExists && !current.exists) return;"), "the shared write can refuse a missing record");
const practice = webhook.slice(webhook.indexOf("async function endPractice"), webhook.indexOf("async function applyMayaPass"));
assert.ok(practice.includes("if (!snap.exists) return;"), "Practice ending does not recreate a deleted account");

console.log("account deletion ok");
