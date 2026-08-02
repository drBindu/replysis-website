// app/real-interview/_lib/settings.ts
// Single source of truth for settings

export type AppSettings = {
  model:          string;
  maxDelay:       number;
  operatingPoint: "enhanced" | "standard";
  temperature:    number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  model:          "llama-3.1-8b-instant",
  maxDelay:       0.7,
  operatingPoint: "enhanced",
  temperature:    0.3,
};

export const MODELS = [
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B",     tag: "FAST",     color: "blue"   },
  { id: "llama-3.3-70b",    label: "Llama 3.3 70B",    tag: "SMART",    color: "purple" },
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