export type InterviewMode = "general" | "coding" | "system-design";

export const INTERVIEW_MODES: Array<{
  id: InterviewMode;
  label: string;
  shortLabel: string;
  description: string;
  output: string;
}> = [
  {
    id: "general",
    label: "General Interview",
    shortLabel: "General",
    description: "Behavioral, role-specific, and follow-up questions.",
    output: "Natural, resume-grounded answers",
  },
  {
    id: "coding",
    label: "Coding Interview",
    shortLabel: "Coding",
    description: "Algorithms, debugging, data structures, and code review.",
    output: "Approach, code, complexity, tests, and explanation",
  },
  {
    id: "system-design",
    label: "System Design",
    shortLabel: "System Design",
    description: "Architecture, scale, APIs, storage, and trade-offs.",
    output: "Requirements, estimates, design, risks, and narration",
  },
];

export function isInterviewMode(value: unknown): value is InterviewMode {
  return value === "general" || value === "coding" || value === "system-design";
}
