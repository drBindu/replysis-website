// Checks that the after sign-in redirect stays on this site. Run: node --experimental-strip-types scripts/check-safe-path.mjs
import assert from "node:assert/strict";
import { safeInternalPath } from "../app/lib/safe-path.ts";

const fallback = "/real-interview";
assert.equal(safeInternalPath("/account"), "/account");
assert.equal(safeInternalPath("/mock-interview?x=1#a"), "/mock-interview?x=1#a");
assert.equal(safeInternalPath(null), fallback);
assert.equal(safeInternalPath(""), fallback);
assert.equal(safeInternalPath("https://evil.com"), fallback);
assert.equal(safeInternalPath("//evil.com"), fallback);
assert.equal(safeInternalPath(String.raw`/\evil.com`), fallback, "a backslash is read as a slash by the browser");
assert.equal(safeInternalPath(String.raw`/\/evil.com`), fallback);
assert.equal(safeInternalPath("/\t/evil.com"), fallback, "a tab is dropped by the browser");
assert.equal(safeInternalPath("/\n/evil.com"), fallback);
assert.equal(safeInternalPath("javascript:alert(1)"), fallback);
console.log("safe path ok");
