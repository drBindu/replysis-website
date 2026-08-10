// Every user-facing failure message lives here.
//
// Keeping them in one place is what stops the tone drifting: one file to review,
// one place to change wording, and no chance of a raw exception string reaching
// a user because someone rendered `err.message` in a hurry.
//
// House rules for anything added below:
//   1. Say what happened in plain language.
//   2. Say whether their work is safe, when there is any doubt.
//   3. Give exactly one next action.
//   4. Never blame the person reading it.
//   5. Never include status codes, provider names, endpoints, or exception text.

export type FailureKind =
  | "offline"
  | "timeout"
  | "server"
  | "rateLimited"
  | "sessionExpired"
  | "permissionDenied"
  | "noCredits"
  | "payment"
  | "stt"
  | "ai"
  | "upload"
  | "backup"
  | "updateCheck"
  | "notFound"
  | "maintenance"
  | "unknown";

export type FailureCopy = {
  /** Short label. Used as the toast heading or inline title. */
  title: string;
  /** One or two sentences: what happened, and whether their work is safe. */
  body: string;
  /** Label for the single next action. Omitted when there is nothing to do. */
  action?: string;
};

export const FAILURE_COPY: Record<FailureKind, FailureCopy> = {
  offline: {
    title: "You are offline",
    body: "We could not reach Replysis right now. Anything already saved remains available. Check your connection and try again.",
    action: "Try again",
  },
  timeout: {
    title: "This is taking longer than usual",
    body: "The response is taking longer than expected. Anything already saved remains available.",
    action: "Try again",
  },
  server: {
    title: "Replysis is temporarily unavailable",
    body: "Our service encountered a problem. Your account is fine and anything already saved remains available.",
    action: "Try again",
  },
  rateLimited: {
    title: "Too many requests",
    body: "Too many requests were made in a short time. Please wait a moment and try again.",
    action: "Try again",
  },
  sessionExpired: {
    title: "Your session has expired",
    body: "Your sign-in session has expired. Sign in again to pick up where you left off.",
    action: "Sign in",
  },
  permissionDenied: {
    title: "You do not have access to this",
    body: "This area is not available on your account. If you think that is wrong, contact support.",
    action: "Go home",
  },
  noCredits: {
    title: "You are out of credits",
    body: "You have used your available credits. Choose a plan to keep going.",
    action: "View plans",
  },
  payment: {
    title: "Payment could not be completed",
    body: "Your payment could not be completed and you were not charged. Check your details or try another payment method.",
    action: "Try again",
  },
  stt: {
    title: "Listening is paused",
    body: "Listening is temporarily unavailable. Reconnecting now.",
  },
  ai: {
    title: "No answer this time",
    body: "We could not generate an answer this time. No credits were used.",
    action: "Try again",
  },
  upload: {
    title: "We could not read this file",
    body: "Try a PDF, DOCX, or TXT file under the supported size limit.",
    action: "Choose another file",
  },
  backup: {
    title: "Saved on this device",
    body: "Your interview was saved on this device, but cloud backup is temporarily unavailable. We will try again automatically.",
  },
  updateCheck: {
    title: "Could not check for updates",
    body: "We could not check for updates just now. Replysis is still fully usable.",
    action: "Try again",
  },
  notFound: {
    title: "Page not found",
    body: "We could not find that page. It may have moved or no longer exists.",
    action: "Go home",
  },
  maintenance: {
    title: "Replysis is under maintenance",
    body: "We are making a short update. Your account is fine and anything already saved remains available. Please check back shortly.",
  },
  unknown: {
    title: "Something interrupted that",
    body: "That did not finish. Anything already saved remains available.",
    action: "Try again",
  },
};

/**
 * Maps a failed request to the right message without ever surfacing the
 * underlying error. Call this instead of reading `error.message` in a component.
 *
 * `status` is the HTTP status when there is one; a network-level failure has
 * no status at all, which is why the offline check comes first.
 */
export function classifyFailure(status?: number, isOffline?: boolean): FailureKind {
  if (isOffline || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return "offline";
  }
  if (!status) return "unknown";

  if (status === 401) return "sessionExpired";
  if (status === 402) return "noCredits";
  if (status === 403) return "permissionDenied";
  if (status === 404) return "notFound";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rateLimited";
  if (status === 503) return "maintenance";
  if (status >= 500) return "server";

  return "unknown";
}

export function copyFor(kind: FailureKind): FailureCopy {
  return FAILURE_COPY[kind] ?? FAILURE_COPY.unknown;
}
