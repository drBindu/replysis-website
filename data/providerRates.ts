/**
 * What each provider charges us, for working out cost per user.
 *
 * THESE ARE NOT FILLED IN. They are null on purpose.
 *
 * Token counts in the admin portal are measured: they come back from the
 * provider on every request and are stored against the charge. Money does not
 * come back from anywhere, so it can only be calculated from a published price
 * list, and a price invented here would appear in the portal as a hard figure
 * and be trusted like one. While a rate is null the portal shows tokens and
 * says the rate is unset, which is the honest version of not knowing.
 *
 * To turn cost reporting on, put today's published prices in below. Both
 * numbers are US dollars per MILLION tokens, which is how both providers quote.
 *
 *   Cerebras   https://www.cerebras.ai/pricing
 *   Gemini     https://ai.google.dev/pricing
 *   Speechmatics is quoted per hour of audio, not per token.
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
  "gpt-oss-120b": null,

  // Screen reading and the answer fallback. Google.
  "gemini-3.5-flash-lite": null,
  "gemini-3.1-flash-lite": null,
};

/**
 * Speechmatics, per hour of audio streamed.
 *
 * This is the cost credits were never able to see: a microphone held open bills
 * by the hour whether or not a single question is asked, which is why listening
 * minutes are metered separately from credits in the first place.
 */
export const STT_USD_PER_HOUR: number | null = null;

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
