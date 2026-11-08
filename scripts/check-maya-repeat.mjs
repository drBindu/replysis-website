// Maya's "ask it again" turn (bug round 52, 2026-11-07).
// 1) An answer Maya asks again for (short, under 12 words) gets no feedback bought and no 0 added to the score.
// 2) One question is asked again at most twice, then the interview moves on, so steady background noise cannot keep her
//    saying "I didn't catch that" forever. 3) A repeat over that limit is never spoken as her way into the next question.
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/mock-interview/page.tsx", import.meta.url), "utf8");
const fail = (msg) => { console.error(`app/mock-interview/page.tsx: ${msg}`); process.exit(1); };

const end = page.indexOf('if (feedbackTimingRef.current === "end")');
if (end < 0) fail("the at-the-end feedback branch was not found");
const branch = page.slice(end, page.indexOf("continueAfterAnswerRef.current(qIndex", end));
const turnAt = branch.indexOf("turnForRef.current(qIndex, ans)");
const feedbackAt = branch.indexOf("runFeedback()");
if (turnAt < 0 || feedbackAt < 0 || feedbackAt < turnAt) fail("feedback must wait for Maya's turn, so a repeated question is not charged");
if (!/action === "repeat" && ans\.trim\(\)\.split\(\/\\s\+\/\)\.length < 12/.test(branch)) fail("a short answer Maya repeats must skip feedback");

if (!/action === "repeat" && \(repeatsAt\.current\.get\(i\) \?\? 0\) < 2/.test(page)) fail("repeats of one question must be capped at two");
if (!page.includes("repeatsAt.current = new Map();")) fail("the repeat count must reset with each new interview");
if (!/const said = turn && turn\.action !== "repeat" \? turn\.say : null;/.test(page)) fail("a repeat over the limit must not be spoken as the next question");

console.log("maya repeat rules ok");
