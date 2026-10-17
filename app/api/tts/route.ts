// The interviewer's voice. POST { text } -> raw 16 bit PCM, mono, 24 kHz (header X-Sample-Rate), a woman's voice.
//
// Needed because the face (Simli) is driven by audio we hold: the browser's built-in voice cannot be handed to it. Signed
// in users only, short text only, and limited per person, so it cannot be used as a free speech service.

import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "../../lib/rate-limit";
import { verifiedUid } from "../../lib/verify-user";

export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash-preview-tts";
const VOICE = "Kore";                 // a clear, warm woman's voice
const MAX_CHARS = 500;

export async function POST(req: Request) {
  const uid = await verifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`tts:${uid}`, 40, 10 * 60_000).ok || !rateLimit(`tts-ip:${clientIp(req)}`, 120, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice unavailable" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!text || text.length > MAX_CHARS) return NextResponse.json({ error: "Invalid text" }, { status: 400 });

  const request = {
    contents: [{ parts: [{ text }] }],
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
