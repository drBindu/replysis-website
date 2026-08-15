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
  resume_analysis: 10,
  resume_tailor: 20,
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

export const PUBLIC_CREDIT_COSTS = [
  { action: "Start live transcription", cost: CREDIT_ACTION_COSTS.live_transcription_start },
  { action: "Generate a live answer", cost: CREDIT_ACTION_COSTS.realtime_per_minute },
  { action: "Start a mock session", cost: CREDIT_ACTION_COSTS.mock_interview_session },
  { action: "Generate mock feedback", cost: CREDIT_ACTION_COSTS.mock_feedback },
  { action: "Generate a question set", cost: CREDIT_ACTION_COSTS.question_generation },
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
