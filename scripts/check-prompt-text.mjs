// Checks the cleaning of resume, job description and prompt turns on the browser interview path.
// Run: node --experimental-strip-types scripts/check-prompt-text.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanResumeForPrompt, sanitizeMessages, sanitizeText, MAX_TURN_CHARS } from "../app/lib/prompt-text.ts";

// Spaces stay spaces (the old cleaner turned every space into a hyphen).
assert.equal(cleanResumeForPrompt("Senior Engineer at Acme Corp - Java"), "Senior Engineer at Acme Corp - Java");
// Letters in any language stay; long dashes and smart quotes are made plain.
const accented = "José Müller, हिन्दी";
assert.equal(cleanResumeForPrompt(accented), accented);
assert.equal(cleanResumeForPrompt("2019–2021 ‘lead’ “team”…"), "2019-2021 'lead' \"team\"...");
// Hidden characters go.
assert.equal(cleanResumeForPrompt("Ja​ne‮ Doe\u0007"), "Jane Doe");
assert.equal(sanitizeText("José​\tx"), "Josx".replace("Jos", "José"));

// The system turn keeps the whole prompt; the rules alone are longer than a normal turn.
const rules = "RULE ".repeat(1_600);            // 8,000 characters, like the real rules
const resume = "Built payment systems in Java. ".repeat(200);   // 6,200 characters
const tail = "\nANSWER STYLE PREFERENCE: concise";
const [system, user] = sanitizeMessages([
  { role: "system", content: rules + resume + tail },
  { role: "user", content: "q".repeat(MAX_TURN_CHARS + 500) },
]);
assert.ok(system.content.endsWith("concise"), "the answer style at the end of the system turn is kept");
assert.equal(user.content.length, MAX_TURN_CHARS, "other turns keep their cap");

// The browser interview uses the fixed cleaner, and the old pattern is gone.
const hook = readFileSync(new URL("../app/real-interview/_hooks/useInterview.ts", import.meta.url), "utf8");
assert.ok(hook.includes("cleanResumeForPrompt(config.resume)"));
assert.ok(!hook.includes("function sanitizeResume"));

console.log("prompt text ok");
