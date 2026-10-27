// The interviewer's voice. POST { text } -> raw 16 bit PCM, mono, 24 kHz (header X-Sample-Rate), a woman's voice.
//
// Needed because the face (Simli) is driven by audio we hold: the browser's built-in voice cannot be handed to it. Signed
// in users only, short text only, and limited per person, so it cannot be used as a free speech service.

import { NextResponse } from "next/server";
import { getApps } from "firebase-admin/app";
import { rateLimit, clientIp } from "../../lib/rate-limit";
import { verifiedUid } from "../../lib/verify-user";

export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash-preview-tts";
const VOICE = "Kore";                 // a clear, warm woman's voice
const MAX_CHARS = 500;

/**
 * Google Cloud Text-to-Speech, the same "Kore" voice, about three times faster (measured 2026-10-27: 1.1 to 1.4 s for two
 * sentences, against 3.5 to 4.5 s from the Gemini voice). Signed in with the server's own Google service account (the
 * Firebase one; the API is enabled on project copilotx-ai). Null on any failure, and the Gemini voice is used instead.
 * It reads the words plainly (no tone directions), which suits Maya's calm manner (owner: no overacting).
 */
let cloudToken: { token: string; until: number } | null = null;
async function cloudVoice(text: string): Promise<Buffer | null> {
  try {
    if (!cloudToken || Date.now() > cloudToken.until) {
      const credential = getApps()[0]?.options.credential;
      if (!credential) return null;
      const t = await credential.getAccessToken();
      cloudToken = { token: t.access_token, until: Date.now() + Math.max(60, (t.expires_in ?? 3600) - 300) * 1000 };
    }
    const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: { Authorization: `Bearer ${cloudToken.token}`, "Content-Type": "application/json",
                 "x-goog-user-project": process.env.FIREBASE_PROJECT_ID || "copilotx-ai" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-US", name: `en-US-Chirp3-HD-${VOICE}` },
        // Owner, 2026-10-27: "she is talking very fast". A calm interviewer's pace; MAYA_SPEAKING_RATE adjusts it on the
        // server without a release (0.85 to 1.0 sound natural).
        audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000,
                       speakingRate: Number(process.env.MAYA_SPEAKING_RATE) || 0.9 },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      if (res.status === 401) cloudToken = null;
      console.error(`[tts] cloud voice HTTP ${res.status}`);
      return null;
    }
    const b64 = (await res.json())?.audioContent;
    if (typeof b64 !== "string" || !b64) return null;
    let wav = Buffer.from(b64, "base64");
    // LINEAR16 comes as a WAV file: the 16 bit samples follow the "data" chunk header.
    const data = wav.indexOf("data");
    if (wav.subarray(0, 4).toString() === "RIFF" && data > 0) wav = wav.subarray(data + 8);
    return wav.length > 2 ? wav : null;
  } catch (e) {
    console.error("[tts] cloud voice failed:", (e as Error)?.name ?? "Error");
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Her lines are voiced a sentence at a time (2026-10-27), so an interview asks for about three times as many.
  if (!rateLimit(`tts:${uid}`, 150, 10 * 60_000).ok || !rateLimit(`tts-ip:${clientIp(req)}`, 300, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice unavailable" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!text || text.length > MAX_CHARS) return NextResponse.json({ error: "Invalid text" }, { status: 400 });

  // How she sounds saying it (Maya's reactions, 2026-10-24). Gemini's voice follows a short spoken-style direction placed
  // before the line and does not read the direction aloud.
  // Owner, 2026-10-27: "not too much overacting". Every direction is understated: a calm, experienced professional on a
  // call whose feeling shows only a little in her voice.
  const STYLE: Record<string, string> = {
    warm: "Say in a calm, natural, friendly tone, like an experienced interviewer on a video call",
    amused: "Say naturally with a slight, quiet smile in your voice, no laughing",
    impressed: "Say naturally, sounding quietly pleased, not excited",
    curious: "Say naturally with mild interest",
    thoughtful: "Say calmly, at an unhurried pace",
    serious: "Say calmly and plainly",
    firm: "Say calmly and plainly, polite but clear",
  };
  const fast = await cloudVoice(text);
  if (fast) {
    return new NextResponse(new Uint8Array(fast), {
      headers: { "Content-Type": "application/octet-stream", "X-Sample-Rate": "24000", "Cache-Control": "no-store" },
    });
  }

  const style = typeof body?.tone === "string" ? STYLE[body.tone] : undefined;
  const request = {
    contents: [{ parts: [{ text: style ? `${style}: ${text}` : text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) { console.error(`[tts] provider HTTP ${res.status}`); continue; }
      const data = await res.json();
      const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (typeof b64 !== "string" || b64.length === 0) continue;   // the model sometimes answers with no audio: ask once more
      const pcm = Buffer.from(b64, "base64");
      return new NextResponse(new Uint8Array(pcm), {
        headers: { "Content-Type": "application/octet-stream", "X-Sample-Rate": "24000", "Cache-Control": "no-store" },
      });
    } catch (e) {
      console.error("[tts] request failed:", (e as Error)?.name ?? "Error");
    }
  }
  return NextResponse.json({ error: "Voice unavailable" }, { status: 502 });
}
