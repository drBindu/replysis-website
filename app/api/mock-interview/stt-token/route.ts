import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Mock interview uses the same authenticated STT token service as the Windows
// app. The website's older, separately configured Speechmatics key can expire
// independently and leave the browser unable to start listening.
const backendBase = (process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://replysis.com").replace(/\/$/, "");

export async function GET(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in to start listening." }, { status: 401 });
  }

  try {
    const response = await fetch(`${backendBase}/api/v1/stt/key?purpose=mock`, {
      method: "GET",
      headers: { Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const reason = body?.reason === "audio-limit" ? "audio-limit" : undefined;
      const status = [401, 402, 429].includes(response.status) ? response.status : 503;
      console.error(`[mock STT] backend token request failed status=${response.status}`);
      return NextResponse.json({ error: "Listening is unavailable.", reason },
        { status, headers: { "Cache-Control": "no-store" } });
    }

    const body = await response.json();
    const speechmatics = typeof body?.key === "string" && body.key ? body.key : undefined;
    const deepgram = typeof body?.deepgramToken === "string" && body.deepgramToken ? body.deepgramToken : undefined;
    if (!speechmatics && !deepgram) {
      console.error("[mock STT] backend returned no speech token");
      return NextResponse.json({ error: "Listening is unavailable." }, { status: 503 });
    }

    // Deepgram is the first choice and Speechmatics the backup, as in the Windows app. Both are short lived.
    return NextResponse.json({ token: speechmatics, deepgramToken: deepgram },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[mock STT] backend unavailable type=${error instanceof Error ? error.name : "unknown"}`);
    return NextResponse.json({ error: "Listening is unavailable." }, { status: 503 });
  }
}
