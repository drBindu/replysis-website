/**
 * Cleaning of text that goes into a model prompt on the website's answer route (app/api/stt/tokens).
 *
 * Letters in any language stay: an accented name ("Jose with an accent", "Muller with an umlaut") or a company written in another script is part of
 * the resume, and stripping every character outside plain ASCII turned them into "Jos" and "Mller" (round 21,
 * 2026-11-07). Control characters, zero width characters and direction overrides are removed, since they only hide
 * text from the person reading it.
 */

const MAX_TEXT_CHARS = 30_000;
export const MAX_MESSAGES = 24;
/** Interviewer, answer and reminder turns. */
export const MAX_TURN_CHARS = 6_000;
/**
 * The system turn carries the rules, the answer style and the whole resume. The rules alone are about 7,500
 * characters, so the old 6,000 cap cut every system prompt: the coding and system design instructions and the answer
 * style at its end were always lost, and a longer resume was cut part way. It is held to the cleaned resume size plus
 * the rules instead.
 */
export const MAX_SYSTEM_CHARS = 40_000;

export function normalizeDashes(input: string): string {
  return (input || "").replace(new RegExp("[-\u2013\u2212]", "g"), "-").replace(new RegExp("\u00A0", "g"), " ");
}

/** Control characters (tab and newline kept as before: newline only), zero width and direction marks. */
const HIDDEN = new RegExp("[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]", "g");

export function sanitizeText(text: string, max = MAX_TEXT_CHARS): string {
  if (!text) return "";
  const cleaned = normalizeDashes(text).replace(HIDDEN, "");
  if (cleaned.length > max) {
    console.warn(`sanitizeText: input truncated from ${cleaned.length} to ${max} chars`);
  }
  return cleaned.slice(0, max);
}

export function sanitizeMessages(value: unknown): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_MESSAGES).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { role?: unknown; content?: unknown };
    if (candidate.role !== "system" && candidate.role !== "user" && candidate.role !== "assistant") return [];
    if (typeof candidate.content !== "string") return [];
    const cap = candidate.role === "system" ? MAX_SYSTEM_CHARS : MAX_TURN_CHARS;
    const content = sanitizeText(candidate.content, cap);
    return content ? [{ role: candidate.role, content }] : [];
  });
}

/**
 * The resume and job description the browser interview sends with each question. The old cleaner in useInterview.ts
 * had a character class meant for long dashes that had become "[- - ]", which matches a plain space: every space in
 * the resume and job description was sent as a hyphen ("Senior-Engineer-at-Acme-Corp"), and every letter outside
 * plain ASCII was dropped. Spaces and letters now stay.
 */
export function cleanResumeForPrompt(text: string): string {
  if (!text) return "";
  return text
    .replace(new RegExp("[\u2018\u2019]", "g"), "'")
    .replace(new RegExp("[\u201C\u201D]", "g"), '"')
    .replace(new RegExp("[\u2013\u2014\u2212]", "g"), "-")
    .replace(new RegExp("\u00A0", "g"), " ")
    .replace(new RegExp("\u2026", "g"), "...")
    .replace(new RegExp("[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]", "g"), "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
