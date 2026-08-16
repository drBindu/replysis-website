/**
 * Public product facts used across pricing, trust, and in-product usage UI.
 *
 * This file is safe to import from client and server code. Plan caps and credit
 * costs live here so enforcement, account UI, pricing, and support copy cannot
 * silently drift apart.
 */
export const PLAN_MONTHLY_CREDITS = {
  free: 100,
  pro: 2_000,
  max: 5_000,
  // Retired plans remain resolvable for existing accounts and renewals.
  lifetime: 5_000,
  teams: 10_000,
} as const;

export type PlanId = keyof typeof PLAN_MONTHLY_CREDITS;
export type ActivePlanId = "free" | "pro" | "max";

export const CREDIT_ACTION_COSTS = {
  live_transcription_start: 1,
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

export const PUBLIC_PLAN_CAPACITY = {
  free: {
    label: "Starter",
    credits: PLAN_MONTHLY_CREDITS.free,
    summary: "100 credits each month",
    example: "Enough to explore live answers, mock practice, and resume tools.",
  },
  pro: {
    label: "Pro",
    credits: PLAN_MONTHLY_CREDITS.pro,
    summary: "2,000 credits each month",
    example: "Up to 100 guided mock sessions when used only for mock practice.",
  },
  max: {
    label: "Max",
    credits: PLAN_MONTHLY_CREDITS.max,
    summary: "5,000 credits each month",
    example: "2.5x Pro capacity, or up to 250 guided mock sessions.",
  },
} as const;

// Every row here is a charge the product actually makes, and every charge the
// product makes has a row here. "Start a mock session" used to sit in this list
// at 15 credits and was never deducted anywhere, while rewriting a bullet and
// generating a summary were charged 5 each and appeared nowhere. Both directions
// are the same problem: a price list that does not describe the product.
export const PUBLIC_CREDIT_COSTS = [
  { action: "Start live transcription", cost: CREDIT_ACTION_COSTS.live_transcription_start },
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
