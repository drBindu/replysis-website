// Checks that listening in the browser never leaves the microphone on after it was stopped, and that a second Space
// press cannot start a second listener. Run: node --experimental-strip-types scripts/check-listening-start.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ── Small browser stand-ins ─────────────────────────────────────
const tracks = [];
let releaseMic;
globalThis.window = globalThis;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
  onLine: true,
  mediaDevices: {
    // The permission prompt: the microphone opens only when the test says so.
    getUserMedia: () => new Promise((resolve) => {
      releaseMic = () => {
        const track = { stopped: false, stop() { this.stopped = true; } };
        tracks.push(track);
        resolve({ getTracks: () => [track] });
      };
    }),
  },
} });
class FakeSocket {
  static OPEN = 1;
  constructor() { this.readyState = 1; this.sent = []; FakeSocket.last = this; }
  send(m) { this.sent.push(m); }
  close() { this.readyState = 3; }
}
globalThis.WebSocket = FakeSocket;
let contexts = 0;
globalThis.AudioContext = class {
  constructor() { contexts++; this.closed = false; this.sampleRate = 16000; this.audioWorklet = { addModule: async () => {} }; }
  resume() { return Promise.resolve(); }
  close() { this.closed = true; return Promise.resolve(); }
  createMediaStreamSource() { return { connect() {} }; }
  get destination() { return {}; }
};
globalThis.AudioWorkletNode = class { constructor() { this.port = {}; } connect() {} disconnect() {} };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ token: "t" }) });
globalThis.URL.createObjectURL = () => "blob:x";
globalThis.URL.revokeObjectURL = () => {};
const flush = () => new Promise((r) => setTimeout(r, 0));

const { SpeechmaticsClient } = await import("../app/real-interview/_lib/stt-client.ts");

// 1. Stopped while the microphone prompt is still open: the microphone that opens afterwards is closed at once,
//    and nothing says "Listening".
{
  const statuses = [];
  const client = new SpeechmaticsClient();
  await client.start({ onStatus: (s) => statuses.push(s), onPartial() {}, onFinal() {}, onError() {} });
  FakeSocket.last.onopen();
  await flush();
  client.stop();
  releaseMic();
  await flush(); await flush();
  assert.equal(tracks.at(-1).stopped, true, "the microphone opened after stop must be closed");
  assert.equal(client.stream, null, "a stopped client holds no microphone");
  assert.ok(!statuses.some((s) => s.startsWith("Listening")), "a stopped client must not say it is listening");
}

// 2. Normal start still listens and keeps the microphone.
{
  const statuses = [];
  const client = new SpeechmaticsClient();
  await client.start({ onStatus: (s) => statuses.push(s), onPartial() {}, onFinal() {}, onError() {} });
  FakeSocket.last.onopen();
  await flush();
  releaseMic();
  await flush(); await flush();
  assert.equal(tracks.at(-1).stopped, false, "a live client keeps its microphone");
  assert.ok(statuses.some((s) => s.startsWith("Listening")), "a live client says it is listening");
  client.stop();
  assert.equal(tracks.at(-1).stopped, true, "stop releases the microphone");
}

// 3. The hook ignores a held Space key and a second press while listening is starting.
{
  const hook = readFileSync(new URL("../app/real-interview/_hooks/useInterview.ts", import.meta.url), "utf8");
  assert.match(hook, /if \(e\.repeat\) return;/, "a held Space key must not start listening again");
  assert.match(hook, /if \(listeningRef\.current\) return;\s*listeningRef\.current = true;/, "startMic must refuse a second start");
  assert.match(hook, /if \(sttClient\.current !== client\) return;/, "a replaced client's error must not end the live one");
}

// 4. Session saves run one at a time, so a quick second save updates the first copy instead of making another.
{
  const session = readFileSync(new URL("../app/real-interview/_hooks/useSession.ts", import.meta.url), "utf8");
  assert.match(session, /saveChain\.current\.then\(\(\) => sendSave\(payload\)\)/, "saves must wait for the one before");
}

console.log("listening start ok");

// 5. The ready-made spoken replies follow the copy rule: no dashes.
{
  const files = ["../app/real-interview/_lib/promptBuilder.ts", "../app/real-interview/_hooks/useInterview.ts"];
  for (const f of files) {
    const text = readFileSync(new URL(f, import.meta.url), "utf8");
    for (const line of text.split("\n").filter((l) => /great to be here|exciting challenge|Doing really well/.test(l))) {
      assert.ok(!/ - |—|–/.test(line), `no dash in a spoken reply: ${line.trim()}`);
    }
  }
}
console.log("spoken replies ok");
