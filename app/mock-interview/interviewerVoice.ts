/**
 * Chooses the interviewer's spoken voice. The interviewer on screen is a woman, so the voice must be a woman's: the browser's
 * default voice is whatever the computer has (often a man's, such as "David" on Windows), which is what a tester heard
 * (owner, 2026-10-17). Voices differ by device, so this ranks what is there instead of naming one.
 */
export type VoiceLike = { name: string; lang: string; localService?: boolean; default?: boolean };

const MALE = /\b(david|mark|guy|ryan|george|james|richard|thomas|daniel|alex|fred|rishi|ravi|prabhat|hemant|male)\b/i;
const FEMALE = /\b(aria|jenny|michelle|ana|sonia|libby|natasha|neerja|swara|zira|hazel|susan|samantha|karen|moira|tessa|victoria|allison|ava|emma|serena|fiona|catherine|heera|female|woman)\b/i;
/** Microsoft's neural voices in Edge are far more natural than the older installed ones. */
const NATURAL = /natural|neural|online/i;

export function interviewerVoiceScore(v: VoiceLike): number {
  if (!/^en(-|_|$)/i.test(v.lang)) return -1000;          // an English interviewer
  if (MALE.test(v.name)) return -500;                       // never a man's voice
  let score = 0;
  if (FEMALE.test(v.name)) score += 100;
  if (/google/i.test(v.name) && /female/i.test(v.name)) score += 100;
  if (/google us english/i.test(v.name)) score += 60;      // Chrome's Google US English voice is female
  if (NATURAL.test(v.name)) score += 40;
  if (/^en[-_](US|IN|GB)$/i.test(v.lang)) score += 10;
  return score;
}

/** The best voice for the interviewer, or null to leave the browser's own choice when nothing suitable is installed. */
export function pickInterviewerVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;                                         // a voice must beat zero: a plain English voice of unknown sex is not chosen
  for (const v of voices) {
    const s = interviewerVoiceScore(v);
    if (s > bestScore) { best = v; bestScore = s; }
  }
  return best;
}
