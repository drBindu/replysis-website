import type { InterviewQuestion } from "./interviewQuestions";

/** A readable address for a question: the id keeps it unique, the words make it worth clicking in search results. */
export function questionSlug(q: InterviewQuestion): string {
  const words = q.question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join("-");
  return `${q.id}-${words}`;
}

export const questionPath = (q: InterviewQuestion) => `/interview-questions/${questionSlug(q)}`;
