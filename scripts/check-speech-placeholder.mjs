// The backend sends "speech-backup-unavailable" as the Speechmatics key when only Deepgram gave a token. The mock interview
// route must recognise that exact word and never hand it to the browser as a real key (round 30, 2026-11-07).
import { readFileSync } from "node:fs";

const backend = readFileSync(new URL("../../backend/src/main/java/com/replysis/backend/controller/SttController.java", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/mock-interview/stt-token/route.ts", import.meta.url), "utf8");

const javaWord = backend.match(/SPEECHMATICS_UNAVAILABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
const tsWord = route.match(/SPEECHMATICS_UNAVAILABLE_KEY\s*=\s*"([^"]+)"/)?.[1];

let failed = false;
if (!javaWord || !tsWord) { console.error("placeholder constant not found in backend or route"); failed = true; }
else if (javaWord !== tsWord) { console.error(`placeholder differs: backend "${javaWord}" route "${tsWord}"`); failed = true; }
if (!/body\.key !== SPEECHMATICS_UNAVAILABLE_KEY/.test(route)) { console.error("route no longer drops the placeholder key"); failed = true; }

if (failed) process.exit(1);
console.log("speech placeholder ok");
