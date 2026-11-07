// Checks that resume text reaches the PDF as text, as the preview shows it. Run: node --experimental-strip-types scripts/check-resume-text.mjs
import assert from "node:assert/strict";
import { escapeResumeText } from "../app/lib/resume-text.ts";

assert.equal(escapeResumeText("Built the <Header> component"), "Built the &lt;Header&gt; component");
assert.equal(escapeResumeText("R&D, C++ & Java"), "R&amp;D, C++ &amp; Java");
assert.equal(escapeResumeText('Said "hi"'), "Said &quot;hi&quot;");
assert.equal(escapeResumeText("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
const data = { personalInfo: { name: "A <B>" }, experience: [{ bullets: ["x < y", "ok"] }], n: 3, on: true, none: null };
assert.deepEqual(escapeResumeText(data), { personalInfo: { name: "A &lt;B&gt;" }, experience: [{ bullets: ["x &lt; y", "ok"] }], n: 3, on: true, none: null });
assert.deepEqual(data.personalInfo.name, "A <B>", "the original resume is left unchanged");
console.log("resume text ok");
