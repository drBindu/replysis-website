/**
 * Public product facts used across pricing, trust, and in-product usage UI.
 *
 * Keep marketing copy derived from this file. The enforcement values live in
 * app/lib/credits.ts and the server credit routes; changing a plan requires
 * updating both enforcement and these customer-facing facts in the same PR.
 */
export const PUBLIC_PLAN_CAPACITY = {
  free: {
    label: "Starter",
    credits: 100,
    summary: "100 credits each month",
    example: "Enough to explore live answers, mock practice, and resume tools.",
  },
  pro: {
    label: "Pro",
    credits: 2_000,
    summary: "2,000 credits each month",
    example: "Up to 100 guided mock sessions when used only for mock practice.",
  },
  max: {
    label: "Max",
    credits: 5_000,
    summary: "5,000 credits each month",
    example: "2.5x Pro capacity, or up to 250 guided mock sessions.",
  },
} as const;

export const PUBLIC_CREDIT_COSTS = [
  { action: "Start live transcription", cost: 1 },
  { action: "Generate a live answer", cost: 2 },
  { action: "Start a mock session", cost: 15 },
  { action: "Generate mock feedback", cost: 5 },
  { action: "Generate a question set", cost: 5 },
  { action: "Analyze a resume", cost: 10 },
  { action: "Tailor a resume", cost: 20 },
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
