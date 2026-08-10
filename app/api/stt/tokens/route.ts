import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { rateLimit, clientIp } from "../../../lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Short id shared between a server log line and the response body. It lets
 * someone match a user's report to the exact failure without the response ever
 * carrying the underlying cause.
 */
function correlationId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ============================================================================
// 1) FIREBASE ADMIN
// ============================================================================
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

if (!getApps().length) {
  if (projectId && clientEmail && privateKeyInput) {
    try {
      let formattedKey = privateKeyInput;
      if (!formattedKey.startsWith("---")) {
        formattedKey = Buffer.from(formattedKey, "base64").toString("utf8");
      }
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: formattedKey }),
      });
      console.log("✅ Firebase Admin Initialized Successfully");
    } catch (error) {
      console.error("Firebase Init Error:", error);
    }
  }
}

const db = getApps().length ? getFirestore() : null;

// ============================================================================
// 2) LOGGING
// ============================================================================
async function logUsageAndIncrement(email: string, service: string, details: any) {
  if (!db) return;
  try {
    // PRIVACY: usage logs store metadata only — never the transcript text.
    // Interview transcripts are personal data (the user's AND the interviewer's
    // words); billing/analytics only needs volume, not content.
    await db.collection("api_usage_logs").add({
      userEmail:       email || "Anonymous",
      service,
      transcriptChars: (details.transcript || "").length,
      durationSeconds: details.duration   || 0,
      timestamp:       FieldValue.serverTimestamp(),
      mode:            details.mode       || "chat",
    });
    if (email) {
      const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!userQuery.empty) {
        await userQuery.docs[0].ref.update({
          usageCount:           FieldValue.increment(1),
          totalDurationSeconds: FieldValue.increment(details.duration || 0),
          lastUsed:             FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.error("Log Error:", err);
  }
}

// ============================================================================
// 3) HELPERS
// ============================================================================
function normalizeDashes(input: string) {
  return (input || "").replace(/[-–−]/g, "-").replace(/\u00A0/g, " ");
}

function sanitizeText(text: string) {
  if (!text) return "";
  const cleaned = normalizeDashes(text).replace(/[^\x20-\x7E\n]/g, "");
  if (cleaned.length > 30000) {
    console.warn(`sanitizeText: input truncated from ${cleaned.length} to 30000 chars`);
  }
  return cleaned.slice(0, 30000);
}

const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 6_000;
const VALID_MODES = new Set([
  "verify_resume", "generate_script", "generate_feedback", "generate_questions", "realtime",
]);

function requestTooLarge(req: Request): boolean {
  const contentLength = Number(req.headers.get("content-length") || "0");
  return Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES;
}

function sanitizeMessages(value: unknown): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_MESSAGES).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { role?: unknown; content?: unknown };
    if (candidate.role !== "system" && candidate.role !== "user" && candidate.role !== "assistant") return [];
    if (typeof candidate.content !== "string") return [];
    const content = sanitizeText(candidate.content).slice(0, MAX_MESSAGE_CHARS);
    return content ? [{ role: candidate.role, content }] : [];
  });
}

function cleanJson(text: string) {
  try {
    const firstBrace = text.indexOf("{");
    if (firstBrace === -1) return "{}";
    // Walk forward to find the matching closing brace
    let depth = 0;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) return text.substring(firstBrace, i + 1);
      }
    }
    return "{}";
  } catch { return "{}"; }
}

// ============================================================================
// 4) MODEL ROUTER
// ============================================================================
type ModelProvider = "groq" | "openai" | "gemini";

const MODEL_MAP: Record<string, { provider: ModelProvider; apiModel: string }> = {
  "llama-3.1-8b":         { provider: "groq",   apiModel: "llama-3.1-8b-instant"     },
  "llama-3.3-70b":        { provider: "groq",   apiModel: "llama-3.3-70b-versatile"  },
  "mixtral-8x7b":         { provider: "groq",   apiModel: "mixtral-8x7b-32768"       },
  "llama-3.1-8b-instant": { provider: "groq",   apiModel: "llama-3.1-8b-instant"     },
  "gpt-4o":               { provider: "openai", apiModel: "gpt-4o"                   },
  "gpt-4o-mini":          { provider: "openai", apiModel: "gpt-4o-mini"              },
  "gemini-1.5-pro":       { provider: "gemini", apiModel: "gemini-1.5-pro"           },
  "gemini-1.5-flash":     { provider: "gemini", apiModel: "gemini-1.5-flash"         },
};

function resolveModel(modelId: string): { provider: ModelProvider; apiModel: string } {
  if (!modelId) return { provider: "groq", apiModel: "llama-3.1-8b-instant" };
  if (MODEL_MAP[modelId]) return MODEL_MAP[modelId];
  const lower = modelId.toLowerCase();
  if (MODEL_MAP[lower]) return MODEL_MAP[lower];
  for (const key of Object.keys(MODEL_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return MODEL_MAP[key];
  }
  console.warn(`⚠️ Unknown model "${modelId}", defaulting to Groq`);
  return { provider: "groq", apiModel: "llama-3.1-8b-instant" };
}

// ── OpenAI-compatible caller (Groq + OpenAI) ──
async function callOpenAICompatible(
  baseUrl:  string,
  apiKey:   string,
  apiModel: string,
  messages: any[],
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const body: any = {
    model:       apiModel,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens:  opts.max_tokens  ?? 1000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res  = await fetch(`${baseUrl}/chat/completions`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`📡 ${baseUrl} status: ${res.status}`);
  if (!res.ok || data.error) {
    // Type and status only. The provider echoes the prompt on some errors, and
    // the prompt holds the resume and transcript.
    console.error(`[stt] model API error status=${res.status} type=${data?.error?.type ?? "unknown"}`);
    throw new Error(`API error: ${JSON.stringify(data.error?.message || data)}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// ── Gemini caller ──
async function callGemini(
  apiKey:       string,
  apiModel:     string,
  systemPrompt: string,
  userPrompt:   string,
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature:      opts.temperature ?? 0.3,
          maxOutputTokens:  opts.max_tokens  ?? 1000,
          responseMimeType: "application/json",
        },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Gemini error: ${JSON.stringify(data.error)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── Main unified LLM caller ──
async function callLLM(
  modelId:      string,
  systemPrompt: string,
  userPrompt:   string,
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const { provider, apiModel } = resolveModel(modelId);
  console.log(`🤖 Calling ${provider} → ${apiModel}`);

  try {
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY missing");
      return await callGemini(apiKey, apiModel, systemPrompt, userPrompt, opts);
    }
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY missing");
      return await callOpenAICompatible("https://api.openai.com/v1", apiKey, apiModel, [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ], opts);
    }
    // Default: Groq
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");
    return await callOpenAICompatible("https://api.groq.com/openai/v1", apiKey, apiModel, [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ], opts);
  } catch (err: any) {
    // Tag which model failed, but do not carry the upstream text: it can echo
    // the prompt, and the prompt contains the resume and transcript.
    throw Object.assign(new Error(`llm_call_failed:${provider}/${apiModel}`), {
      cause: err?.name ?? "Error",
    });
  }
}

// ── NEW: caller that accepts pre-built messages array ──
// Used by promptBuilder.ts which sends full conversation history
async function callLLMWithMessages(
  modelId:  string,
  messages: any[],
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const { provider, apiModel } = resolveModel(modelId);
  console.log(`🤖 callLLMWithMessages → ${provider} ${apiModel} | ${messages.length} messages`);

  if (provider === "gemini") {
    // Gemini needs system + user separated
    const systemMsg = messages.find(m => m.role === "system")?.content || "";
    const userMsg   = messages.filter(m => m.role !== "system")
      .map(m => `${m.role === "user" ? "Interviewer" : "You"}: ${m.content}`)
      .join("\n\n");
    const apiKey    = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    return callGemini(apiKey, apiModel, systemMsg, userMsg, opts);
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");
    return callOpenAICompatible(
      "https://api.openai.com/v1", apiKey, apiModel, messages, opts
    );
  }

  // Default: Groq
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");
  return callOpenAICompatible(
    "https://api.groq.com/openai/v1", apiKey, apiModel, messages, opts
  );
}

// ============================================================================
// 5) CREDIT CHECK
// ============================================================================
const CREDIT_COSTS: Record<string, number> = {
  verify_resume:      0,
  generate_script:    5,
  generate_feedback:  5,
  generate_questions: 5,
  realtime:           2,
  stt_token:          1,
};

// ── Monthly credit caps per plan (single source of truth for enforcement) ──
// Sized so worst-case API cost stays under plan revenue → always profitable.
// Refills every month via the lazy reset below.
const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  free:     100,
  pro:      5000,
  lifetime: 5000,
  teams:    10000,
};

// Owner/internal accounts are never charged (so testing isn't capped).
const UNLIMITED_EMAILS = new Set(
  (process.env.UNLIMITED_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

// First day of next month, midnight — when the monthly allowance refills.
function nextResetISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function checkAndDeductCredits(
  email: string,
  mode:  string
): Promise<{ allowed: boolean; remaining: number; unavailable?: boolean }> {
  const cost = CREDIT_COSTS[mode] ?? 2;
  if (cost === 0) return { allowed: true, remaining: -1 };

  // FAIL CLOSED: if the credit store is unreachable, paid features pause rather
  // than silently becoming free for everyone. `unavailable` lets the caller
  // return 503 (temporary outage) instead of 402 (out of credits).
  if (!db)    return { allowed: false, remaining: 0, unavailable: true };
  if (!email) return { allowed: false, remaining: 0 };

  // Owner/internal accounts: unlimited, just track usage.
  if (UNLIMITED_EMAILS.has(email.toLowerCase())) {
    try {
      const q = await db.collection("users").where("email", "==", email).limit(1).get();
      if (!q.empty) await q.docs[0].ref.update({ creditsUsed: FieldValue.increment(cost) });
    } catch {}
    return { allowed: true, remaining: -1 };
  }

  try {
    const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
    // No account document = nothing to charge = no service. (Signed-up users
    // always have a doc; failing open here let unknown callers ride free.)
    if (userQuery.empty) return { allowed: false, remaining: 0 };
    const userRef = userQuery.docs[0].ref;

    // Read + reset + charge inside ONE transaction so parallel requests can
    // never both pass the balance check and double-spend the same credits.
    return await db.runTransaction(async (tx) => {
      const snap     = await tx.get(userRef);
      const userData = snap.data() ?? {};
      const plan     = userData.plan || "free";
      const cap      = PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
      let   credits  = typeof userData.credits === "number" ? userData.credits : cap;
      let   used     = typeof userData.creditsUsed === "number" ? userData.creditsUsed : 0;

      const updates: Record<string, unknown> = {};

      // ── Lazy monthly reset ──────────────────────────────────────
      // If the reset date has passed, refill to this plan's cap before
      // charging. This is what makes capped plans sustainable — without
      // it a user who hit 0 would be stuck forever.
      const resetAt = userData.creditsResetDate ? Date.parse(userData.creditsResetDate) : 0;
      if (resetAt && Date.now() >= resetAt) {
        credits = cap;
        used    = 0;
        updates.creditsUsed      = 0;
        updates.creditsResetDate = nextResetISO();
      } else if (!userData.creditsResetDate) {
        // Backfill a reset date for older docs that never had one.
        updates.creditsResetDate = nextResetISO();
      }

      if (credits < cost) {
        if (Object.keys(updates).length) tx.update(userRef, updates);
        return { allowed: false, remaining: credits };
      }

      updates.credits     = credits - cost;
      updates.creditsUsed = used + cost;
      tx.update(userRef, updates);
      return { allowed: true, remaining: credits - cost };
    });
  } catch (err) {
    console.error("Credit check error:", err);
    // FAIL CLOSED on store errors too — same rationale as the !db case.
    return { allowed: false, remaining: 0, unavailable: true };
  }
}

async function refundCredits(email: string, mode: string): Promise<void> {
  const cost = CREDIT_COSTS[mode] ?? 2;
  if (!db || !email || cost === 0 || UNLIMITED_EMAILS.has(email.toLowerCase())) return;

  try {
    const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
    if (userQuery.empty) return;
    const userRef = userQuery.docs[0].ref;
    await db.runTransaction(async (tx) => {
      const data = (await tx.get(userRef)).data() ?? {};
      const plan = typeof data.plan === "string" ? data.plan : "free";
      const cap = PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
      const credits = typeof data.credits === "number" ? data.credits : cap;
      const used = typeof data.creditsUsed === "number" ? data.creditsUsed : 0;
      tx.update(userRef, {
        credits: Math.min(cap, Math.max(0, credits) + cost),
        creditsUsed: Math.max(0, used - cost),
      });
    });
  } catch (error) {
    console.error("Credit refund error:", error);
  }
}

// ============================================================================
// 6) DETERMINISTIC RESUME PARSER  (works with any common resume format)
// ============================================================================
const NOW_YEAR      = new Date().getFullYear();
const NOW_MONTH     = new Date().getMonth() + 1;
const MERGE_ADJACENT = false;

const monthMap: Record<string, number> = {
  jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4, may:5,
  jun:6, june:6, jul:7, july:7, aug:8, august:8, sep:9, sept:9, september:9,
  oct:10, october:10, nov:11, november:11, dec:12, december:12,
};

function toMonthNum(s: string)            { return monthMap[s.trim().toLowerCase()] ?? null; }
function monthIndex(y: number, m: number) { return y * 12 + (m - 1); }
function monthsInclusive(s: number, e: number) {
  if (e < s) return 0;
  return e - s + 1;
}
function formatYearsMonths(t: number) { return `${Math.floor(t / 12)} yrs ${t % 12} mos`; }

// ── Slice the experience section (any common header name) ──
function sliceExperienceSection(resume: string): string {
  const lower = resume.toLowerCase();
  const EXP_HEADERS = [
    "professional experience", "work experience", "employment history",
    "career history", "work history", "relevant experience", "experience",
  ];
  const END_HEADERS = [
    "\neducation", "\nskills", "\ncertification", "\nprojects",
    "\ntraining", "\naccomplishment", "\nachievement", "\nreferences",
    "\nadditional", "\nlanguage", "\npublication", "\nvolunteer",
    "\naward", "\nhonor",
  ];
  let start = -1;
  for (const h of EXP_HEADERS) {
    const idx = lower.indexOf(h);
    if (idx !== -1) { start = idx; break; }
  }
  if (start === -1) return resume; // no experience section  -  scan everything
  let end = -1;
  for (const e of END_HEADERS) {
    const idx = lower.indexOf(e, start + 20);
    if (idx !== -1 && (end === -1 || idx < end)) end = idx;
  }
  return end !== -1 ? resume.slice(start, end) : resume.slice(start);
}

// ── Parse a single date range string into {sm,sy,em,ey} ──
// Handles: "Jan 2020 - Mar 2022",  "2020 - 2023",  "01/2020 - 03/2022",
//          "Jan 2020 to Present",  "2020 - current", "May 2021 - Till Date"
function parseDateRange(text: string): {
  sm: number; sy: number; em: number; ey: number; durationText: string;
} | null {
  const s = normalizeDashes(text);
  const isPresent = (t: string) =>
    /^(present|current|now|till\s*date|ongoing|date)$/i.test(t.trim().replace(/\s+/g, " "));

  // ─ Pattern 1: "MonthName YYYY - MonthName YYYY" or "MonthName YYYY - Present"
  const re1 = /([A-Za-z]{3,9})\s+(\d{4})\s*(?:-|to)\s*([A-Za-z][A-Za-z\s]*?)(\d{4})?(?=\s|$|[,;|])/i;
  const m1  = s.match(re1);
  if (m1) {
    const sm = toMonthNum(m1[1]), sy = parseInt(m1[2]);
    if (sm && sy && sy >= 1990 && sy <= NOW_YEAR + 1) {
      const endStr = (m1[3] || "").trim();
      let em: number | null = null, ey: number | null = null;
      if (isPresent(endStr)) {
        em = NOW_MONTH; ey = NOW_YEAR;
      } else {
        const endM = toMonthNum(endStr);
        const endY = m1[4] ? parseInt(m1[4]) : NaN;
        if (endM && endY && endY >= 1990) { em = endM; ey = endY; }
      }
      if (em !== null && ey !== null) {
        return { sm, sy, em, ey, durationText: m1[0].trim() };
      }
    }
  }

  // ─ Pattern 2: "YYYY - YYYY" or "YYYY - Present"
  const re2 = /\b((?:19|20)\d{2})\s*[--]\s*(present|current|now|till\s*date|ongoing|(?:19|20)\d{2})\b/i;
  const m2  = s.match(re2);
  if (m2) {
    const sy = parseInt(m2[1]);
    let em: number, ey: number;
    if (isPresent(m2[2])) { em = NOW_MONTH; ey = NOW_YEAR; }
    else {
      ey = parseInt(m2[2]);
      if (ey < 1990 || ey > NOW_YEAR + 1) return null;
      em = 12;
    }
    return { sm: 1, sy, em, ey, durationText: m2[0].trim() };
  }

  // ─ Pattern 3: "MM/YYYY - MM/YYYY" or "MM/YYYY - Present"
  const re3 = /(\d{1,2})\/(\d{4})\s*[--]\s*(present|current|now|\d{1,2}\/\d{4})/i;
  const m3  = s.match(re3);
  if (m3) {
    const sm = parseInt(m3[1]), sy = parseInt(m3[2]);
    if (sm < 1 || sm > 12 || sy < 1990) return null;
    let em: number, ey: number;
    if (isPresent(m3[3])) { em = NOW_MONTH; ey = NOW_YEAR; }
    else {
      const ep = m3[3].split("/");
      em = parseInt(ep[0]); ey = parseInt(ep[1]);
      if (em < 1 || em > 12 || ey < 1990) return null;
    }
    return { sm, sy, em, ey, durationText: m3[0].trim() };
  }

  return null;
}

// ── Extract jobs from any resume text ──
function extractJobs(text: string) {
  const lines  = text.split("\n").map(l => l.trim()).filter(Boolean);
  const jobs: any[] = [];
  const usedLines = new Set<number>();

  // ── Pass 1: legacy "Client:/Company:/Duration:" format ──
  let lastHeader = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(client:|company:)/i.test(line)) {
      lastHeader = line;
      const p = parseDateRange(line);
      if (p) {
        const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
        jobs.push({
          label: normalizeDashes(lastHeader).replace(p.durationText, "").replace(/[|:]+/g, " ").replace(/\s+/g, " ").trim() || lastHeader,
          durationText: p.durationText, startIdx: sIdx, endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
        usedLines.add(i); continue;
      }
      const p2 = parseDateRange(lines[i + 1] || "");
      if (p2) {
        const sIdx = monthIndex(p2.sy, p2.sm), eIdx = monthIndex(p2.ey, p2.em);
        jobs.push({
          label: lastHeader.replace(/\s+/g, " ").trim(),
          durationText: p2.durationText, startIdx: sIdx, endIdx: eIdx,
          months: monthsInclusive(sIdx, eIdx),
        });
        usedLines.add(i); usedLines.add(i + 1); continue;
      }
      continue;
    }
    if (/^duration\s*:/i.test(line) && lastHeader) {
      const p = parseDateRange(line);
      if (!p) continue;
      const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
      jobs.push({
        label: lastHeader.replace(/\s+/g, " ").trim(),
        durationText: p.durationText, startIdx: sIdx, endIdx: eIdx,
        months: monthsInclusive(sIdx, eIdx),
      });
      usedLines.add(i); continue;
    }
  }

  // ── Pass 2: broad scan  -  any line (or adjacent line) with a date range ──
  // Only runs if pass 1 found nothing
  if (jobs.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      const line = lines[i];

      // Date range IS in this line
      const p = parseDateRange(line);
      if (p) {
        // Label: everything in this line minus the date part, or fall back to prev line
        const stripped = line.replace(p.durationText, "").replace(/[|·•\--]+/g, " ").replace(/\s+/g, " ").trim();
        const label    = stripped.length >= 3 ? stripped : (i > 0 ? lines[i - 1].slice(0, 80) : "Position");
        const sIdx = monthIndex(p.sy, p.sm), eIdx = monthIndex(p.ey, p.em);
        jobs.push({ label, durationText: p.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx) });
        usedLines.add(i); continue;
      }

      // Date range is on the NEXT line (standard resume: title line, then date line)
      if (i + 1 < lines.length && !usedLines.has(i + 1)) {
        const p2 = parseDateRange(lines[i + 1]);
        if (p2) {
          const sIdx = monthIndex(p2.sy, p2.sm), eIdx = monthIndex(p2.ey, p2.em);
          jobs.push({ label: line.slice(0, 80), durationText: p2.durationText, startIdx: sIdx, endIdx: eIdx, months: monthsInclusive(sIdx, eIdx) });
          usedLines.add(i); usedLines.add(i + 1); i++; continue;
        }
      }
    }
  }

  // Deduplicate by startIdx (keep first occurrence)
  const seen = new Set<number>();
  return jobs.filter(j => {
    if (seen.has(j.startIdx)) return false;
    seen.add(j.startIdx); return true;
  });
}

function mergeIntervals(intervals: any[]) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.startIdx - b.startIdx);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = merged[merged.length - 1], next = sorted[i];
    if (MERGE_ADJACENT ? next.startIdx <= cur.endIdx + 1 : next.startIdx <= cur.endIdx)
      cur.endIdx = Math.max(cur.endIdx, next.endIdx);
    else merged.push({ ...next });
  }
  return merged;
}

function verifyResumeDeterministic(resumeRaw: string): {
  totalExperience: string; summary: string; hasJobs: boolean;
} {
  const resume = sanitizeText(resumeRaw ?? "");
  if (!resume || resume.length < 50)
    return { totalExperience: "0 years 0 months", summary: "Resume text missing or too short.", hasJobs: false };
  const jobs = extractJobs(sliceExperienceSection(resume));
  if (!jobs.length) return {
    totalExperience: "0 years 0 months",
    summary: "Could not parse date ranges automatically.",
    hasJobs: false,
  };
  const grossMonths = jobs.reduce((s, j) => s + j.months, 0);
  const merged      = mergeIntervals(jobs.map(j => ({ startIdx: j.startIdx, endIdx: j.endIdx })));
  const netMonths   = merged.reduce((s, it) => s + monthsInclusive(it.startIdx, it.endIdx), 0);
  const lines       = [`Resume Verification:`];
  jobs.forEach((j, idx) => lines.push(`  ${idx + 1}. ${j.label} | ${j.durationText} = ${j.months} mos`));
  lines.push(`Gross total : ${formatYearsMonths(grossMonths)}`);
  lines.push(merged.length !== jobs.length ? `(overlapping roles merged)` : ``);
  lines.push(`Net total   : ${formatYearsMonths(netMonths)}`);
  return { totalExperience: formatYearsMonths(netMonths), summary: lines.filter(Boolean).join("\n"), hasJobs: true };
}

// ============================================================================
// 7) GET: SPEECHMATICS TOKEN
// ============================================================================
export async function GET(req: Request) {
  let tokenCreditCharged = false;
  let tokenCreditEmail = "";
  try {
    // FAIL CLOSED: if Firebase Admin never initialized we cannot verify anyone,
    // so no real Speechmatics tokens get minted for unverifiable callers.
    if (!getApps().length) {
      console.error("[stt GET] Firebase Admin not initialized — refusing token mint");
      return NextResponse.json({ error: "Auth service unavailable" }, { status: 503 });
    }

    // Verify Firebase ID token
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let verifiedEmail = "Unknown User";
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      verifiedEmail = decoded.email ?? "Unknown User";
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit token minting: each call mints a real Speechmatics token,
    // so cap per-user (or per-IP) to stop token farming. 30/min is far above
    // a real interview's ~1-per-100s refresh rate.
    const rlKey = verifiedEmail !== "Unknown User" ? `sttmint:${verifiedEmail}` : `sttmint:${clientIp(req)}`;
    const rl = rateLimit(rlKey, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many token requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const creditResult = await checkAndDeductCredits(verifiedEmail, "stt_token");
    if (!creditResult.allowed) {
      return NextResponse.json(
        { error: creditResult.unavailable ? "Credit service unavailable" : "Insufficient credits" },
        { status: creditResult.unavailable ? 503 : 402 },
      );
    }
    tokenCreditCharged = true;
    tokenCreditEmail = verifiedEmail;

    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) {
      await refundCredits(tokenCreditEmail, "stt_token");
      tokenCreditCharged = false;
      return NextResponse.json({ error: "Key missing" }, { status: 500 });
    }
    const response = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body:    JSON.stringify({ ttl: 120 }),   // 120s gives more headroom before expiry
    });
    if (!response.ok) {
      await refundCredits(tokenCreditEmail, "stt_token");
      tokenCreditCharged = false;

      // Status only. The upstream body can echo the request (including the
      // Authorization header on some providers), so it is never logged.
      const ref = correlationId();
      console.error(`[stt GET] transcription token mint failed ref=${ref} status=${response.status}`);

      // A key or permission problem is ours, not the caller's, so it is reported
      // as a service outage rather than handing back the provider's diagnosis.
      const isQuota = response.status === 429;
      return NextResponse.json(
        {
          error: isQuota
            ? "Listening is busy right now. Please wait a moment and try again."
            : "Listening is temporarily unavailable. Please try again shortly.",
          ref,
        },
        { status: isQuota ? 429 : 503 },
      );
    }
    const data = await response.json();
    await logUsageAndIncrement(verifiedEmail, "Speechmatics", { action: "Token Requested" });
    return NextResponse.json({ token: data.key_value });
  } catch (error: any) {
    if (tokenCreditCharged) await refundCredits(tokenCreditEmail, "stt_token");
    const ref = correlationId();
    console.error(`[stt GET] unexpected failure ref=${ref} type=${error?.name ?? "Error"}`);
    return NextResponse.json(
      { error: "Listening is temporarily unavailable. Please try again shortly.", ref },
      { status: 503 },
    );
  }
}

// ============================================================================
// 8) POST
// ============================================================================
export async function POST(req: Request) {
  let creditCharged = false;
  let chargedEmail = "";
  let chargedMode = "";
  try {
    // ── VERIFY FIREBASE ID TOKEN ──────────────────────────────────
    // FAIL CLOSED: no verification infrastructure = no service, never
    // "skip the check and proceed".
    if (!getApps().length) {
      console.error("[stt POST] Firebase Admin not initialized — refusing request");
      return NextResponse.json({ error: "Auth service unavailable" }, { status: 503 });
    }
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let verifiedEmail: string | undefined;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      verifiedEmail = decoded.email ?? undefined;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestLimit = rateLimit(`stt:${verifiedEmail ?? clientIp(req)}`, 30, 60_000);
    if (!requestLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(requestLimit.retryAfter) } },
      );
    }

    if (requestTooLarge(req)) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const {
      transcript, resume, jd,
      userEmail: bodyEmail, duration,
      mode, question, answer,
      model, messages, context,
    } = body;

    // Always use the server-verified email, never trust the body
    const userEmail = verifiedEmail ?? bodyEmail ?? "";
    if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
      return NextResponse.json({ error: "Unsupported request mode." }, { status: 400 });
    }
    const safeMessages = sanitizeMessages(messages);

    // ── MODEL RESTRICTION BY PLAN ────────────────────────────────
    // Free users may only use the fast Llama model.
    // Pro, Lifetime, Teams users have no restriction.
    const FREE_MODELS = ["llama-3.1-8b-instant", "llama-3.1-8b"];

    let selectedModel = typeof model === "string" && MODEL_MAP[model]
      ? model
      : "llama-3.1-8b-instant";

    if (db && userEmail) {
      try {
        const userQuery = await db.collection("users").where("email", "==", userEmail).limit(1).get();
        if (!userQuery.empty) {
          const plan = userQuery.docs[0].data().plan || "free";
          if (plan === "free" && !FREE_MODELS.includes(selectedModel)) {
            console.warn(`[model-guard] free user "${userEmail}" tried "${selectedModel}" → clamped to llama`);
            selectedModel = "llama-3.1-8b-instant";
          }
          // pro, lifetime, teams: no restriction
        }
      } catch (err) {
        console.warn("[model-guard] plan lookup failed; using the free model:", err);
        selectedModel = "llama-3.1-8b-instant";
      }
    }

    const { provider }     = resolveModel(selectedModel);
    console.log(`🤖 Model: "${selectedModel}" → ${provider}`);

    // ── VERIFY RESUME ──
    if (mode === "verify_resume") {
      const result = verifyResumeDeterministic(resume);

      await logUsageAndIncrement(
        userEmail || "Unknown", "Resume-Verify",
        { mode: "verify_resume", transcript: "", duration: duration || 0 }
      );
      return NextResponse.json({ totalExperience: result.totalExperience, summary: result.summary });
    }

    // ── CREDIT CHECK ──
    const creditResult = await checkAndDeductCredits(userEmail || "", mode || "realtime");
    if (!creditResult.allowed) {
      // Store outage ≠ out of credits: surface a retryable 503 instead of
      // telling a paying user to upgrade.
      if (creditResult.unavailable) {
        return NextResponse.json({
          error:   "credit_service_unavailable",
          message: "Service temporarily unavailable. Please try again in a moment.",
        }, { status: 503 });
      }
      return NextResponse.json({
        error:     "insufficient_credits",
        message:   "You've used all your credits. Upgrade to continue.",
        remaining: creditResult.remaining,
      }, { status: 402 });
    }

    creditCharged = (CREDIT_COSTS[mode] ?? 2) > 0;
    chargedEmail = userEmail;
    chargedMode = mode;
    const refundAndRespond = async (payload: Record<string, unknown>, status = 503) => {
      // Report whether the charge was actually returned. The client uses this to
      // decide if it may tell the user no credits were spent, instead of
      // promising a refund it cannot see.
      let creditsRefunded = false;
      if (creditCharged) {
        await refundCredits(chargedEmail, chargedMode);
        creditCharged = false;
        creditsRefunded = true;
      }
      return NextResponse.json({ ...payload, creditsRefunded }, { status });
    };

    // ════════════════════════════════════════════════════
    // MODE: GENERATE QUESTIONS
    // ════════════════════════════════════════════════════
    if (mode === "generate_questions") {
      const safeResume = sanitizeText(resume);
      const safeJd     = sanitizeText(jd);
      try {
        const systemPrompt = `You are an interview question generator. Return ONLY valid JSON.\nFormat: {"questions":["question 1",...,"question 50"]}`;
        const userPrompt   = `Generate exactly 50 interview questions.\n\nRESUME:\n${safeResume.slice(0, 2500)}\n\nJOB DESCRIPTION:\n${(safeJd || "Software Engineer role").slice(0, 800)}\n\nRules:\n- Mix technical, behavioral, situational\n- No "Tell me about yourself"\n- No numbering inside strings\n- Return exactly 50 questions`;
        const rawContent   = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 2500, json: true });
        let parsed: any    = {};
        try { parsed = JSON.parse(rawContent); }
        catch { try { parsed = JSON.parse(cleanJson(rawContent)); } catch { return await refundAndRespond({ questions: [], error: "Failed to parse AI response. Please try again." }); } }
        const questions = Array.isArray(parsed?.questions)
          ? parsed.questions.map((x: any) => String(x || "").trim()).filter(Boolean)
          : [];
        if (questions.length < 10) {
          console.warn(`generate_questions: only ${questions.length} questions returned, expected 50`);
          return await refundAndRespond({ questions: [], error: "Not enough questions generated. Please try again." });
        }
        await logUsageAndIncrement(userEmail || "Unknown", `Questions-${provider}`, { mode: "generate_questions", transcript: "", duration: duration || 0 });
        return NextResponse.json({ questions });
      } catch (err: any) {
        console.error(`[stt] generate_questions failed type=${err?.name ?? "Error"}`);
        return await refundAndRespond({ questions: [], error: "Failed to generate questions. Please try again." });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE SCRIPT
    // ════════════════════════════════════════════════════
    if (mode === "generate_script") {
      const safeResume = sanitizeText(resume);
      const safeJd     = sanitizeText(jd);
      const safeQ      = sanitizeText(question);
      const safeA      = sanitizeText(answer);
      try {
        const systemPrompt =
          `You're helping someone practice their interview. Write a natural, conversational answer.\n` +
          `Return ONLY this JSON: {"betterAnswerExample":"...","resume_proof":"..."}\n` +
          `- 3-5 sentences max, SHORT and SPECIFIC\n` +
          `- Use REAL facts from the resume\n` +
          `- Start: "Yeah so...", "So for that..."\n` +
          `- resume_proof: specific resume detail used`;
        const userPrompt = `RESUME:\n${safeResume}\n\nJD:\n${safeJd || "N/A"}\n\nQ:\n${safeQ}\n\nANSWER:\n${safeA}`;
        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 300, json: true });
        let out: any = {};
        try { out = JSON.parse(cleanJson(rawContent)); } catch { out = {}; }
        await logUsageAndIncrement(userEmail || "Unknown", `Script-${provider}`, { mode: "generate_script", transcript: safeQ, duration: duration || 0 });
        return NextResponse.json({ betterAnswerExample: out?.betterAnswerExample || "", resume_proof: out?.resume_proof || "" });
      } catch (err: any) {
        console.error(`[stt] generate_script failed type=${err?.name ?? "Error"}`);
        return await refundAndRespond({ betterAnswerExample: "", resume_proof: "", error: "Failed to generate script" });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: GENERATE FEEDBACK
    // ════════════════════════════════════════════════════
    if (mode === "generate_feedback") {
      const safeResume = sanitizeText(resume);
      const safeJd     = sanitizeText(jd);
      const safeQ      = sanitizeText(question);
      const safeA      = sanitizeText(answer);
      try {
        const systemPrompt =
          `You're a practical interview coach.\n` +
          `Return ONLY this JSON: {"score":0-10,"strengths":[...],"improvements":[...],"betterAnswerExample":"...","resume_proof":"..."}\n` +
          `- Score 0-10: clarity, confidence, relevance\n` +
          `- strengths: 2-3 specific things that worked\n` +
          `- improvements: exact wording tips\n` +
          `- betterAnswerExample: SHORT (3-5 sentences), REAL resume facts\n` +
          `- resume_proof: resume details used`;
        const userPrompt = `RESUME:\n${safeResume}\n\nJD:\n${safeJd || "N/A"}\n\nQ:\n${safeQ}\n\nANSWER:\n${safeA}`;
        const rawContent = await callLLM(selectedModel, systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 400, json: true });
        const parsed = JSON.parse(cleanJson(rawContent));
        await logUsageAndIncrement(userEmail || "Unknown", `Feedback-${provider}`, { mode: "generate_feedback", transcript: safeQ, duration: duration || 0 });
        return NextResponse.json({
          score:               typeof parsed.score === "number" ? Math.min(10, Math.max(0, parsed.score)) : 0,
          strengths:           Array.isArray(parsed.strengths)    ? parsed.strengths    : [],
          improvements:        Array.isArray(parsed.improvements) ? parsed.improvements : [],
          betterAnswerExample: typeof parsed.betterAnswerExample === "string" ? parsed.betterAnswerExample : "",
          resume_proof:        typeof parsed.resume_proof        === "string" ? parsed.resume_proof        : "",
        });
      } catch {
        return await refundAndRespond({ score: 0, strengths: [], improvements: ["Error generating feedback. Please try again."], betterAnswerExample: "", resume_proof: "" });
      }
    }

    // ════════════════════════════════════════════════════
    // MODE: REAL-TIME INTERVIEW
    // ── KEY CHANGE: accepts pre-built messages array
    //    from promptBuilder.ts which includes full
    //    conversation history for per-session memory
    // ════════════════════════════════════════════════════
    await logUsageAndIncrement(
      userEmail, `RealTime-${provider}`, { transcript, duration }
    );

    let rawAnswer = "";

    if (safeMessages.length > 0) {
      // ── NEW PATH: use pre-built messages from promptBuilder ──
      // Full conversation history + system prompt + format reminder
      // already assembled on the frontend  -  just pass through
      console.log(`📨 Using promptBuilder messages (${safeMessages.length} turns)`);
      try {
        rawAnswer = await callLLMWithMessages(
          selectedModel,
          safeMessages,
          { temperature: 0.3, max_tokens: 600 }
        );
      } catch (err: any) {
        console.error(`[stt] model call failed type=${err?.name ?? "Error"}`);
        return await refundAndRespond({ error: "AI service unavailable. Please try again." });
      }

    } else {
      // ── LEGACY PATH: old single-turn logic ──
      // Kept for backward compatibility with any
      // other parts of the app still using old format
      console.log(`📨 Using legacy single-turn logic`);
      const safeTranscript = sanitizeText(typeof transcript === "string" ? transcript : "").slice(0, 6_000);
      const safeContext = sanitizeText(typeof context === "string" ? context : "").slice(0, 4_000);
      const lowerQ    = safeTranscript.toLowerCase().trim();
      const wordCount = safeTranscript.split(/\s+/).length;

      const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\.,]?\s*$/i.test(lowerQ);
      const isSmallTalk = /how are you|how's it going|how you doing/i.test(lowerQ) && wordCount <= 6;
      const isGreetingPlusSmallTalk = /^(hi|hello|hey)[\s,]+.*(how are you|how's it going)/i.test(lowerQ);

      const logisticalKeywords = ["relocate","relocation","start date","notice period","salary","compensation","ctc","travel","visa","sponsorship","citizenship","work authorization","hybrid","remote","onsite"];
      const behavioralKeywords = ["challenge","conflict","difficult","weakness","strength","describe a time","tell me about a time","mistake","failure","team","pressure","deadline","leadership"];

      const isIntroduction = /tell (me|us) about yourself|introduce yourself|walk (me|us) through/i.test(safeTranscript);
      const isCompanyPitch = wordCount > 80;
      const isLogistical   = logisticalKeywords.some(kw => lowerQ.includes(kw));
      const isBehavioral   = behavioralKeywords.some(kw => lowerQ.includes(kw));

      let systemInstruction = "";
      if (isGreeting && !isSmallTalk && !isGreetingPlusSmallTalk) {
        systemInstruction = `Simple greeting. Reply with ONE word only.`;
      } else if (isSmallTalk || isGreetingPlusSmallTalk) {
        systemInstruction = `Professional small talk. ONE short professional sentence.`;
      } else if (isCompanyPitch) {
        systemInstruction = `Interviewer gave a long intro. Acknowledge in 10-15 words max.`;
      } else if (isIntroduction) {
        systemInstruction = `Introduce yourself. Start with your most recent/current role from the resume. 5-6 bullets using •. Never start with education.`;
      } else if (isLogistical) {
        systemInstruction = `Simple HR question. Answer in 1 sentence only. Be direct.`;
      } else if (isBehavioral) {
        systemInstruction = `Real example from CURRENT job first. 3-5 sentences: situation, tools, result. Start: "Yeah, so..."`;
      } else {
        systemInstruction = `Answer the question. Simple=1-2 sentences, complex=4-5 bullets using •. Use REAL resume details from the provided resume. Lead with the most recent experience.`;
      }

      rawAnswer = await callLLM(
        selectedModel,
        systemInstruction,
        `RESUME:\n${sanitizeText(typeof resume === "string" ? resume : "").slice(0, 12_000)}\n\nContext: ${safeContext}\n\nINTERVIEWER: "${safeTranscript}"\n\nAnswer naturally using real resume details.`,
        { temperature: 0.3, max_tokens: 400 }
      );
    }

    // ── Clean up AI response ──
    const aiAns = rawAnswer
      .replace(/^(Based on the resume|As the candidate|According to|The resume mentions|Looking at your resume|As mentioned in|My background|As per)/i, "")
      .replace(/^(I have extensive experience|I primarily use|With my experience|In my experience)/i, "")
      .replace(/^(Thank you for|Thanks for the|I appreciate)/i, "")
      .replace(/```[a-z]*|```/g, "")
      .trim();

    return NextResponse.json({ answer: aiAns });

  } catch (error: any) {
    console.error("API Error", error);
    if (creditCharged) await refundCredits(chargedEmail, chargedMode);
    return NextResponse.json({ error: "Request could not be completed. Please try again." }, { status: 503 });
  }
}
