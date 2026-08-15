// app/real-interview/_lib/settings.ts
// Single source of truth for settings

export type AppSettings = {
  model:          string;
  maxDelay:       number;
  operatingPoint: "enhanced" | "standard";
  temperature:    number;
  answerStyle:    AnswerStyle;
  customInstructions: string;
};

export type AnswerStyle = "concise" | "balanced" | "detailed" | "star" | "executive";

export const ANSWER_STYLES: Array<{ id: AnswerStyle; label: string; description: string }> = [
  { id: "concise", label: "Concise", description: "Direct answer in 2–3 points" },
  { id: "balanced", label: "Balanced", description: "Natural detail without over-answering" },
  { id: "detailed", label: "Detailed", description: "More reasoning, examples, and context" },
  { id: "star", label: "STAR", description: "Situation, task, action, and result" },
  { id: "executive", label: "Executive", description: "Decision, impact, and trade-off first" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  model:          "openai/gpt-oss-20b",
  maxDelay:       0.7,
  operatingPoint: "enhanced",
  temperature:    0.3,
  answerStyle:    "balanced",
  customInstructions: "",
};

export const MODELS = [
  // Groq retired the Llama models on 2026-08-16. A saved preference using an
  // old id still resolves, because MODEL_MAP keeps those ids as aliases.
  { id: "openai/gpt-oss-20b",  label: "GPT-OSS 20B",  tag: "FAST",     color: "blue"   },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", tag: "SMART",    color: "purple" },
  { id: "gpt-4o-mini",      label: "GPT-4o Mini",      tag: "BALANCED", color: "green"  },
  { id: "gpt-4o",           label: "GPT-4o",           tag: "BEST",     color: "yellow" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", tag: "GOOGLE",   color: "red"    },
] as const;

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("icSettings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    console.warn("Failed to load settings from localStorage, using defaults:", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings) {
  try { localStorage.setItem("icSettings", JSON.stringify(s)); } catch (e) {
    console.warn("Failed to save settings to localStorage:", e);
  }
}
