// Checks the refund and dispute rules. Run: node --experimental-strip-types scripts/check-refunds.mjs
import assert from "node:assert/strict";
import { afterTakingBack, endAfterTakingBackMonth, isFullDispute, isFullRefund, purchaseFromMetadata } from "../app/lib/refund-rules.ts";

const now = Date.parse("2026-11-02T00:00:00Z");
const day = 86_400_000;

assert.equal(isFullRefund({ refunded: true, amount: 100, amount_refunded: 100 }), true);
assert.equal(isFullRefund({ refunded: false, amount: 100, amount_refunded: 40 }), false, "partial changes nothing");
assert.equal(isFullRefund({ refunded: false, amount: 0, amount_refunded: 0 }), false);
assert.equal(isFullDispute(100, 100), true);
assert.equal(isFullDispute(40, 100), false);

assert.deepEqual(purchaseFromMetadata({ uid: "a", purchaseType: "plan_pass" }), { kind: "plan_pass" });
assert.deepEqual(purchaseFromMetadata({ uid: "a", purchaseType: "maya_pass" }), { kind: "maya_pass" });
assert.deepEqual(purchaseFromMetadata({ uid: "a", credits: "500" }), { kind: "pack", credits: 500 });
assert.deepEqual(purchaseFromMetadata({ uid: "a", minutes: "60" }), { kind: "minutes", minutes: 60 });
assert.deepEqual(purchaseFromMetadata({ uid: "a", purchaseType: "minutes_auto_add", minutes: "60" }), { kind: "minutes", minutes: 60 });
assert.equal(purchaseFromMetadata({ uid: "a" }), null, "a subscription invoice is found another way");
assert.equal(purchaseFromMetadata(null), null);

assert.equal(afterTakingBack(800, 500), 300);
assert.equal(afterTakingBack(100, 500), 0, "already spent: stops at zero");

assert.equal(endAfterTakingBackMonth(new Date(now + 10 * day).toISOString(), now), null, "the only month goes");
assert.equal(endAfterTakingBackMonth(new Date(now + 40 * day).toISOString(), now), new Date(now + 10 * day).toISOString(), "a second month paid stays");
assert.equal(endAfterTakingBackMonth(undefined, now), null);

console.log("refund rules ok");
