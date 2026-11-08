// Checks the owner's admin numbers (round 29, 2026-11-07).
// Run: node --experimental-strip-types scripts/check-admin-metrics.mjs
import assert from "node:assert/strict";
import { indiaSales, manualPlanFields, realPlanCounts } from "../app/lib/admin-metrics.ts";

// Today's production shape: 3 internal Max, 1 internal Pro, 1 India Pro month paid once, no trials.
const today = realPlanCounts({ paid: 5, pro: 2, max: 3, trial: 0, internal: 6, internalPaid: 4, internalPro: 1, internalMax: 3,
                               internalTrial: 0, passPro: 1, passMax: 0 });
assert.deepEqual(today, { realPaid: 1, realPro: 1, realMax: 0, subPro: 0, subMax: 0 },
  "the India month is a paying customer but not a dollar subscription");

// An internal account on the trial was taken off twice: once as internal, once as a trial.
const friendOnTrial = realPlanCounts({ paid: 3, pro: 3, max: 0, trial: 2, internal: 1, internalPaid: 1, internalPro: 1, internalMax: 0,
                                       internalTrial: 1 });
assert.equal(friendOnTrial.realPaid, 1, "one stranger pays: 3 on pro, 1 internal trial, 1 external trial");
assert.equal(friendOnTrial.realPro, 1);

// An owner test account on an India month is already out of realPro, so it must not come off the subscriptions again
// (round 57). Two outside Pro subscribers plus one internal India month: two subscriptions.
const internalIndia = realPlanCounts({ paid: 3, pro: 3, max: 0, trial: 0, internal: 1, internalPaid: 1, internalPro: 1, internalMax: 0,
                                       internalTrial: 0, passPro: 1, passMax: 0, internalPassPro: 1, internalPassMax: 0 });
assert.equal(internalIndia.realPro, 2);
assert.equal(internalIndia.subPro, 2, "an internal India month is not taken off the monthly revenue twice");

// Rupee sales: dollar pack receipts and refund receipts are not rupee sales; a refund that took something back counts.
const ms = (v) => (typeof v === "number" ? v : null);
const now = Date.parse("2026-11-07T12:00:00Z");
const day = 86_400_000;
const sales = indiaSales([
  { id: "cs_1", uid: "a", amount: 69900, currency: "inr", createdAt: now - 2 * day },
  { id: "pi_2", uid: "b", amount: 16500, minutes: 33, currency: "inr", createdAt: now - 40 * day },
  { id: "pack_cs_3", uid: "c", amount: 1999, currency: "usd", createdAt: now - day },
  { id: "refund_ch_4", uid: "a", createdAt: now },
  { id: "refund_ch_5", uid: "b", nothingRunning: true, createdAt: now },
  { id: "cs_6", uid: "d", amount: null, currency: "inr", createdAt: now },
], ms, now);
assert.equal(sales.totalInr, 864);
assert.equal(sales.last30Inr, 699, "only the last 30 days belong in a monthly figure");
assert.equal(sales.refunds, 1);
assert.deepEqual([...sales.perUser.keys()].sort(), ["a", "b"], "a dollar pack buyer or a refund is not an India buyer");
assert.equal(sales.perUser.get("b").minutes, 33);

// A plan set by hand on a trial account stops being a trial, so the trial job does not undo it.
assert.deepEqual(manualPlanFields("trial", "max", 7500), { plan: "max", credits: 7500, planSource: "admin" });
assert.deepEqual(manualPlanFields("pass", "max", 7500), { plan: "max", credits: 7500 });
assert.deepEqual(manualPlanFields(undefined, "pro", 2500), { plan: "pro", credits: 2500 });

console.log("admin metrics ok");
