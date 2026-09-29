/**
 * Public product facts used across pricing, trust, and in-product usage UI.
 *
 * This file is safe to import from client and server code. Plan caps and credit
 * costs live here so enforcement, account UI, pricing, and support copy cannot
 * silently drift apart.
 */
// Decided with the owner on 2026-09-29. An answer is 5 credits everywhere.
//
//   Free   25 credits    5 answers, ONCE. Not refilled: see creditsAfterMonthlyReset.
//   Pro    2,500 credits 500 answers a month     $34.99
//   Max    7,500 credits 1,500 answers a month   $79.99
//
// Free was 100 credits a month, refilled forever, and cost real money per person for as
// long as they stayed. It is a taste now. Five answers rather than three, because one
// bad first try (a setup problem, Auto answering small talk) would use most of three and
// the person would leave thinking it does not work: five costs about two cents once.
export const PLAN_MONTHLY_CREDITS = {
  free: 25,
  pro: 2_500,
  max: 7_500,
  // Retired plans remain resolvable for existing accounts and renewals.
  lifetime: 7_500,
  teams: 10_000,
} as const;

/**
 * What a balance becomes when the month rolls over. Every place that resets a balance
 * uses this, because the rule used to be copied into each of them and the copies drift.
 *
 * A paid plan is topped up to its monthly amount, plus any credit packs the customer
 * bought, which must survive the refill. Free is NOT topped up: it is a one-time trial,
 * and someone who signs up on the 30th and has not used their five answers must still
 * have them on the 2nd. The Java server has the same rule (creditsAfterReset); the
 * sync check compares the two.
 */
export function creditsAfterMonthlyReset(plan: string, currentCredits: number, purchasedCredits: number): number {
  const key = (plan in PLAN_MONTHLY_CREDITS ? plan : "free") as keyof typeof PLAN_MONTHLY_CREDITS;
  if (key === "free") return Math.max(0, currentCredits);
  return PLAN_MONTHLY_CREDITS[key] + Math.max(0, purchasedCredits);
}

/**
 * Monthly listening time, the second limit.
 *
 * Credits meter questions. Speechmatics bills by the hour of audio, so a
 * microphone held open costs money whether or not anything is asked, and
 * credits could never see it: someone could listen all afternoon, ask five
 * questions, and spend twenty-five credits.
 *
 * Advertised here rather than only enforced, because a limit a customer meets
 * without having been told about it is what refund requests are made of. The
 * numbers must match PLAN_MONTHLY_AUDIO_MINUTES in the STT token route and in
 * the Java backend's FirestoreCreditsService: all of them read and write the
 * same audioMinutesUsed field, so one allowance covers the website and the
 * desktop apps together.
 */
export const PLAN_MONTHLY_AUDIO_MINUTES = {
  // 15 minutes, not an hour. Listening is the only expensive part of this
  // product, and a free user pays nothing for it: an hour of speech costs
  // about $0.54, so ten thousand free users spending a fifth of an hour each
  // is a five-figure rupee bill every month with no revenue behind it.
  // Fifteen minutes is still enough to sit in a real call and watch it work.
  free:        15,   //  15 minutes
  pro:        900,   // 15 hours
  max:      1_800,   // 30 hours
  lifetime: 1_800,
  teams:    6_000,   // 100 hours, shared across the team
} as const;

/**
 * What the same plans include when bought in rupees.
 *
 * India pays a price set for that market rather than converted from dollars:
 * Pro is Rs 699 against $29.99. A quarter of the price cannot carry the same
 * fifteen hours of speech - listening is the only part of this product that
 * costs real money, and at Rs 699 the full allowance loses money on every
 * heavy subscriber.
 *
 * Six hours is about eight interviews in a month, which is more than most
 * people do while job hunting, so the number is smaller without being felt.
 *
 * These are written onto the user when the subscription is created and read
 * back wherever an allowance is checked. The plan stays "pro" or "max", so
 * every feature check in both codebases keeps working: only the size of the
 * allowance differs.
 */
export const INDIA_PLAN_ALLOWANCE = {
  // Credits equal the dollar plans since 2026-09-29: with listening no longer the cost
  // that matters (the answers are what is metered), a smaller number bought nothing except
  // a renewal that handed a rupee subscriber the dollar amount anyway. The rupee prices
  // are unchanged (Rs 699 and Rs 1,299), and at about Rs 0.34 an answer both keep over half.
  pro: { credits: 2_500, audioMinutes: 360 },   //  6 hours
  max: { credits: 7_500, audioMinutes: 720 },   // 12 hours
} as const;

export type PlanId = keyof typeof PLAN_MONTHLY_CREDITS;
export type ActivePlanId = "free" | "pro" | "max";

export const CREDIT_ACTION_COSTS = {
  // Free since 2026-09-29. It cost 1 credit each time a session started or reconnected,
  // which meant a free user's 25 credits were not five answers on the website. Starting
  // still requires enough credits for one answer; it just does not spend any.
  live_transcription_start: 0,
  // 5, not 10. The backend has always charged 5 (ResumeController.ANALYSIS_CREDITS)
  // while this table advertised 10, so every analysis billed half of what the page
  // promised. Aligned downward on purpose: analysis is how someone first sees the
  // product work, and a cheap first look is worth more than the extra credits.
  resume_analysis: 5,
  resume_tailor: 20,
  // Kept for the plan-capacity copy below, which describes a whole mock session.
  // It is NOT a charge: nothing in the product ever deducted it. A mock session
  // bills per action instead (questions, script, feedback), which lands in the
  // same place for a full session but only charges for what is actually used.
  mock_interview_session: 15,
  mock_feedback: 5,
  mock_script: 5,
  // Charged per generated answer, not per minute, despite the name. The desktop
  // backend has always taken 5 for the same action, so the site advertised 2
  // while Pro users were really getting 400 answers from 2,000 credits, not
  // 1,000. This value also drives the web app's own deduction, so both
  // platforms now charge the same.
  realtime_per_minute: 5,
  question_generation: 5,
  verify_resume: 0,
} as const;

// Both limits are stated, because both can be the one a customer meets.
// The customer sees ONE meter: credits, and what they buy in answers
// (owner, 2026-09-29: "credits, and no minutes, no hours, nothing"). Listening
// still has a fair use limit on the server (PLAN_MONTHLY_AUDIO_MINUTES above),
// counted in minutes of speech actually heard, so an open microphone that hears
// nobody costs nothing. It is a cost guard, sized so a customer meets their
// credits first, and it is never quoted as a number here: a number quoted twice
// is a number that drifts.
//
// Answers are derived from the same cost the server charges, never typed.
export const ANSWER_CREDIT_COST = CREDIT_ACTION_COSTS.realtime_per_minute;
export const answersFor = (credits: number) => Math.floor(credits / ANSWER_CREDIT_COST);

/** "5 free answers", for headings and sign-up boxes. Derived, so it cannot drift. */
export const FREE_TRIAL_ANSWERS = Math.floor(PLAN_MONTHLY_CREDITS.free / CREDIT_ACTION_COSTS.realtime_per_minute);
const answersText = (credits: number) =>
  `${credits.toLocaleString("en-US")} credits, about ${answersFor(credits).toLocaleString("en-US")} answers each month`;

// One real interview is about 30 answers with Auto on (it sometimes answers twice).
// Customers think in interviews, not credits, so the copy says both.
export const ANSWERS_PER_INTERVIEW = 30;
export const interviewsFor = (credits: number) =>
  Math.max(1, Math.floor(answersFor(credits) / ANSWERS_PER_INTERVIEW / 5) * 5);

export const PUBLIC_PLAN_CAPACITY = {
  free: {
    label: "Starter",
    credits: PLAN_MONTHLY_CREDITS.free,
    summary: `${PLAN_MONTHLY_CREDITS.free} credits, ${answersFor(PLAN_MONTHLY_CREDITS.free)} answers to try it, once`,
    example: "Enough to see live answers work in a real interview. Pro gives you a month of them.",
  },
  pro: {
    label: "Pro",
    credits: PLAN_MONTHLY_CREDITS.pro,
    summary: answersText(PLAN_MONTHLY_CREDITS.pro),
    example: `About ${answersFor(PLAN_MONTHLY_CREDITS.pro).toLocaleString("en-US")} live answers, enough for about ${interviewsFor(PLAN_MONTHLY_CREDITS.pro)} interviews, or ${Math.floor(PLAN_MONTHLY_CREDITS.pro / 20)} guided mock sessions.`,
  },
  max: {
    label: "Max",
    credits: PLAN_MONTHLY_CREDITS.max,
    summary: answersText(PLAN_MONTHLY_CREDITS.max),
    example: `About ${answersFor(PLAN_MONTHLY_CREDITS.max).toLocaleString("en-US")} live answers, enough for about ${interviewsFor(PLAN_MONTHLY_CREDITS.max)} interviews, or ${Math.floor(PLAN_MONTHLY_CREDITS.max / 20)} guided mock sessions.`,
  },
} as const;

/**
 * What credits cover, and the one caveat that has to be disclosed: live
 * listening is included, subject to a fair use limit.
 */
export const PUBLIC_LIMIT_EXPLAINER = {
  credits: {
    title: "Credits",
    covers: "Every answer, resume analysis, resume tailoring and screen read.",
  },
  listening: {
    title: "Live listening",
    covers: "Included with your credits, subject to fair use.",
    note: "Resume tools, screen analysis and typed questions never use it.",
  },
} as const;

// Every row here is a charge the product actually makes, and every charge the
// product makes has a row here. "Start a mock session" used to sit in this list
// at 15 credits and was never deducted anywhere, while rewriting a bullet and
// generating a summary were charged 5 each and appeared nowhere. Both directions
// are the same problem: a price list that does not describe the product.
export const PUBLIC_CREDIT_COSTS = [
  { action: "Generate a live answer", cost: CREDIT_ACTION_COSTS.realtime_per_minute },
  { action: "Generate a question set", cost: CREDIT_ACTION_COSTS.question_generation },
  { action: "Generate mock feedback", cost: CREDIT_ACTION_COSTS.mock_feedback },
  { action: "Rewrite a bullet or summary", cost: CREDIT_ACTION_COSTS.mock_script },
  { action: "Analyze a resume", cost: CREDIT_ACTION_COSTS.resume_analysis },
  { action: "Tailor a resume", cost: CREDIT_ACTION_COSTS.resume_tailor },
] as const;

export const TRUST_FACTS = {
  audio:
    "Live audio streams from your device to our speech-to-text provider for transcription. Replysis does not store raw interview audio on its application servers.",
  aiProcessing:
    "Resume text, transcripts, and prompts are processed by Replysis and the selected AI provider to generate answers, coaching, and resume suggestions.",
  savedSessions:
    "When session history is used, interview questions, answers, role, company, duration, and a short resume snippet are saved to your account until deletion.",
  screenCapture:
    "The desktop app uses operating-system capture controls to stay out of standard screen-share paths. Coverage depends on the operating system and capture tool, so users should test their setup first.",
} as const;
