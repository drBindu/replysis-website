/**
 * What each provider charges us, for working out cost per user.
 *
 * Token counts in the admin portal are measured: they come back from the
 * provider on every request and are stored against the charge. Money does not
 * come back from anywhere, so it is calculated from the published price lists
 * below, read on 2026-09-15. A rate left null shows in the portal as unpriced
 * rather than free, which is the honest version of not knowing.
 *
 * Both token numbers are US dollars per MILLION tokens, which is how the
 * providers quote.
 *
 *   Cerebras   https://www.cerebras.ai/pricing   (read from the account's own
 *              model cards: gpt-oss-120b $0.35 in, $0.75 out)
 *   Gemini     https://ai.google.dev/gemini-api/docs/pricing
 *   Deepgram   https://deepgram.com/pricing      (per minute of audio)
 *
 * Check them again when a model changes. A stale rate is worse than none: it
 * looks current and quietly misreports every user's cost.
 */

export type TokenRate = {
  /** USD per million input (prompt) tokens. */
  input: number;
  /** USD per million output (completion) tokens. */
  output: number;
};

/**
 * Keyed by the model id exactly as the backend records it, because that is what
 * the portal groups by. A model missing from this map is treated as unpriced
 * rather than free.
 */
export const MODEL_RATES: Record<string, TokenRate | null> = {
  // Answers. Cerebras.
  "gpt-oss-120b": { input: 0.35, output: 0.75 },

  // Screen reading and the answer fallback. Google. Images are charged at the
  // same input rate as text on these models, so screen reads need no separate
  // line: the vision tokens arrive inside promptTokens already.
  "gemini-3.5-flash-lite": { input: 0.30, output: 2.50 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.50 },
};

/**
 * Transcription, per hour of audio streamed.
 *
 * This is the cost credits were never able to see: a microphone held open bills
 * by the hour whether or not a single question is asked, which is why listening
 * minutes are metered separately from credits in the first place.
 *
 * Deepgram nova-3 streaming is the recogniser for English since 2026-09-15, at
 * $0.0077 a minute on pay as you go, which is $0.462 an hour. Deepgram is
 * currently discounting it to $0.0048 a minute ($0.288 an hour); the full price
 * is used here on purpose, because a promotional rate expiring would make every
 * past user look retroactively more expensive than the portal had said.
 *
 * Speechmatics, the fallback and still the recogniser on Mac and for other
 * languages, is $0.129 an hour. Listening minutes are recorded per user but not
 * per provider, so one rate has to stand for both, and the higher one is the
 * one that cannot flatter the margin.
 */
export const STT_USD_PER_HOUR: number | null = 0.462;

/** True when at least one rate is set, so the portal can offer cost at all. */
export function ratesConfigured(): boolean {
  return Object.values(MODEL_RATES).some((r) => r !== null) || STT_USD_PER_HOUR !== null;
}

/**
 * Cost of a model's tokens, or null when that model has no rate.
 *
 * Null rather than zero, so an unpriced model is reported as unknown instead of
 * quietly making a user look cheaper than they are.
 */
export function tokenCost(model: string, promptTokens: number, completionTokens: number): number | null {
  const rate = MODEL_RATES[model];
  if (!rate) return null;
  return (promptTokens / 1_000_000) * rate.input
       + (completionTokens / 1_000_000) * rate.output;
}

/** Cost of listening time, or null when the rate is unset. */
export function sttCost(minutes: number): number | null {
  if (STT_USD_PER_HOUR === null) return null;
  return (minutes / 60) * STT_USD_PER_HOUR;
}
