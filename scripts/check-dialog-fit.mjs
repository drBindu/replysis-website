// Every full screen dialog must fit a short phone screen and scroll inside itself (bug round 32, 2026-11-07).
// The sign-in box and the first-run guide were taller than a 375x548 phone with the page scroll locked, so the close
// button sat above the screen and "Create account" sat under the keyboard, with no way to reach either.
import { readFileSync } from "node:fs";

const DIALOGS = ["components/AuthModal.tsx", "components/FirstRunGuide.tsx"];
let failed = 0;

for (const file of DIALOGS) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const tag = source.match(/role="dialog"[\s\S]*?className="([^"]*)"/);
  const classes = tag ? tag[1].split(/\s+/) : [];
  const problems = [];
  if (!tag) problems.push("no dialog className found");
  if (!classes.some((c) => /^max-h-\[calc\(100dvh-/.test(c))) problems.push("no max height tied to the screen (max-h-[calc(100dvh-...)])");
  if (!classes.includes("overflow-y-auto")) problems.push("does not scroll inside itself (overflow-y-auto)");
  if (classes.includes("overflow-hidden")) problems.push("overflow-hidden would cut off what does not fit");
  if (problems.length) {
    failed++;
    console.error(`${file}: ${problems.join("; ")}`);
  }
}

if (failed) process.exit(1);
console.log("dialogs fit a phone screen ok");
