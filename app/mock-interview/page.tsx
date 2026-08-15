"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import AiRobot3D from "../../components/AiRobot3DSafe";
import BrandIcon from "../../components/BrandIcon";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Mic, MicOff, Camera, CameraOff, Play, SkipForward,
  FileText, Briefcase, Search, Loader2, CheckCircle2,
  Zap, RotateCcw, Volume2, VolumeX, LayoutDashboard,
  Target, AlertCircle, PhoneOff, Shield, Star, TrendingUp,
  Clock, Award, Sparkles, ArrowRight, BarChart3, Cpu,
  Coins, ChevronDown, Bolt, Flame, Gauge, LogIn,
} from "lucide-react";
import { useToast } from "../../components/feedback/Toast";
import { analyzeInterviewTurns } from "../real-interview/_lib/interviewAnalytics";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "/pdf.worker.min.mjs";

// The only two sentences this screen shows when listening fails. Statuses,
// close codes, provider replies and exception names go to the console instead:
// none of them mean anything to someone part-way through a mock interview, and
// several of them describe account configuration they cannot reach.
const LISTENING_UNAVAILABLE = "Listening is temporarily unavailable. Please try again.";
const MIC_BLOCKED = "Microphone access is blocked. Allow microphone access and try again.";

async function fetchCredits() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");

  const response = await fetch("/api/credits", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!response.ok) throw new Error("Unable to fetch credits");
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS  -  light matte (matches real-interview)
// ═══════════════════════════════════════════════════════════════
const T = {
  bg:        "#dde3ed",        // page background
  panel:     "#f2f4f8",        // card / panel surface
  card:      "#edf0f6",        // inner card / inset
  border:    "#d4dae6",        // all borders
  text:      "#1a2332",        // primary text
  textMid:   "#475569",        // secondary text
  textFaint: "#94a3b8",        // placeholder / faint
  accent:    "#1C7A3E",        // indigo accent
  accentBg:  "rgba(31,138,62,0.07)",
  accentBrd: "rgba(31,138,62,0.18)",
  success:   "#21924A",
  successBg: "rgba(31,138,62,0.07)",
  warn:      "#d97706",
  warnBg:    "rgba(217,119,6,0.07)",
  danger:    "#dc2626",
  dangerBg:  "rgba(220,38,38,0.07)",
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
type Phase = "setup" | "ready" | "interview" | "summary";

type Feedback = {
  score:              number;
  strengths:          string[];
  improvements:       string[];
  betterAnswerExample: string;
  resume_proof?:      string;
};

type InterviewTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

type AiModel = {
  id:           string;
  name:         string;
  provider:     string;
  badge:        string;
  speed:        string;
  quality:      "Best" | "Great" | "Good" | "Fast";
  creditsPerQ:  number;
  icon:         string;
  color:        string;  // accent hex for the model
};

type Difficulty = "easy" | "medium" | "hard" | "behavioral" | "mixed";
interface TaggedQuestion {
  text:       string;
  difficulty: Exclude<Difficulty, "mixed">;
  category:   string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const AI_MODELS: AiModel[] = [
  { id: "gpt-4o",         name: "GPT-4o",      provider: "OpenAI", badge: "Recommended", speed: "~2s",   quality: "Best",  creditsPerQ: 5, icon: "🤖", color: "#2E8B45" },
  // Was "Llama 3.3 70B" at 2 credits. Groq retired the Llama models on
  // 2026-08-16, and a live answer has always cost 5 credits, not 2.
  { id: "gpt-oss-120b",   name: "GPT-OSS 120B", provider: "Groq",  badge: "Instant",     speed: "~0.3s", quality: "Great", creditsPerQ: 5, icon: "⚡", color: "#21924A" },
];

const MIN_QUESTIONS          = 5;
const MAX_QUESTIONS_FREE     = 10;
const MAX_QUESTIONS_PRO      = 50;
const SILENCE_DELAY_MS       = 3500;

const PLAN_MAX_QUESTIONS: Record<string, number> = {
  free: MAX_QUESTIONS_FREE, pro: MAX_QUESTIONS_PRO, max: MAX_QUESTIONS_PRO, lifetime: MAX_QUESTIONS_PRO, teams: MAX_QUESTIONS_PRO,
};
const PLAN_DIFFICULTY_ACCESS: Record<string, Difficulty[]> = {
  free:     ["easy", "behavioral", "mixed"],
  pro:      ["easy", "medium", "hard", "behavioral", "mixed"],
  max:      ["easy", "medium", "hard", "behavioral", "mixed"],
  lifetime: ["easy", "medium", "hard", "behavioral", "mixed"],
  teams:    ["easy", "medium", "hard", "behavioral", "mixed"],
};
const DIFFICULTY_OPTIONS: {
  id: Difficulty; label: string; sub: string; color: string;
  bg: string; brd: string; planRequired: "free" | "pro";
}[] = [
  { id: "easy",       label: "Easy",       sub: "Fundamentals and basics",         color: "#21924A", bg: "rgba(31,138,62,0.08)",  brd: "rgba(31,138,62,0.22)",  planRequired: "free" },
  { id: "medium",     label: "Medium",     sub: "Situational and problem-solving", color: "#d97706", bg: "rgba(217,119,6,0.08)",  brd: "rgba(217,119,6,0.22)",  planRequired: "pro"  },
  { id: "hard",       label: "Hard",       sub: "System design and leadership",    color: "#dc2626", bg: "rgba(220,38,38,0.08)",  brd: "rgba(220,38,38,0.22)",  planRequired: "pro"  },
  { id: "behavioral", label: "Behavioral", sub: "STAR, culture fit, teamwork",     color: "#21924A", bg: "rgba(8,145,178,0.08)",  brd: "rgba(8,145,178,0.22)",  planRequired: "free" },
  { id: "mixed",      label: "Mixed",      sub: "Full distribution across levels", color: "#1C7A3E", bg: "rgba(31,138,62,0.08)",  brd: "rgba(31,138,62,0.22)",  planRequired: "free" },
];
const CONTEXT_HISTORY_TURNS = 4; // last N turns injected into AI memory

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const getEmail = () => auth.currentUser?.email ?? "";

const renderSafe = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.summary === "string") return obj.summary;
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
};

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const scoreLabel = (s: number) =>
  s >= 8 ? "Excellent" : s >= 6 ? "Proficient" : s >= 4 ? "Developing" : "Needs Practice";

const scoreHex = (s: number) =>
  s >= 8 ? T.success : s >= 5 ? T.warn : T.danger;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const tagQuestions = (qs: string[], diff: Difficulty): TaggedQuestion[] => {
  const MIXED_CYCLE: Array<Exclude<Difficulty, "mixed">> = [
    "easy", "behavioral", "medium", "easy", "hard", "behavioral",
    "medium", "easy", "behavioral", "hard",
  ];
  const CATEGORIES: Record<Exclude<Difficulty, "mixed">, string[]> = {
    easy:       ["Personal Background", "Basic Technical",   "Self-Assessment",    "Career Goals",      "Role Fit"          ],
    medium:     ["Problem Solving",     "Situational",       "Competency",         "Technical Depth",   "Process & Design"  ],
    hard:       ["System Design",       "Advanced Technical","Leadership",         "Strategic Thinking","Scalability"       ],
    behavioral: ["Culture Fit",         "Teamwork",          "Conflict Resolution","Leadership Style",  "EQ & Adaptability" ],
  };
  return qs.map((text, i) => {
    const d    = diff === "mixed" ? MIXED_CYCLE[i % MIXED_CYCLE.length] : (diff as Exclude<Difficulty, "mixed">);
    const cats = CATEGORIES[d];
    return { text, difficulty: d, category: cats[i % cats.length] };
  });
};

const normalizeQuestions = (res: unknown): string[] => {
  const r = res as Record<string, any>;
  const candidates = [
    r?.questions, r?.data?.questions, r?.result?.questions,
    r?.data, r?.result, Array.isArray(res) ? res : null,
  ];
  for (const c of candidates) {
    if (!Array.isArray(c) || c.length === 0) continue;
    const mapped = c.map((x: unknown) => {
      if (typeof x === "string") return x.trim();
      if (typeof x === "object" && x !== null) {
        const o = x as Record<string, unknown>;
        return String(o.question ?? o.text ?? o.content ?? JSON.stringify(x)).trim();
      }
      return String(x).trim();
    }).filter(Boolean);
    if (mapped.length > 0) return mapped;
  }
  return [];
};

/** Build a concise conversation context block for the AI prompt. */
const buildContextBlock = (history: InterviewTurn[]): string => {
  const recent = history.slice(-CONTEXT_HISTORY_TURNS * 2);
  if (recent.length === 0) return "";
  const pairs: string[] = [];
  for (let i = 0; i < recent.length - 1; i += 2) {
    const q = recent[i]?.text ?? "";
    const a = recent[i + 1]?.text ?? "";
    if (q && a) pairs.push(`Q: ${q}\nA: ${a}`);
  }
  return pairs.length > 0
    ? `\n\n[CONVERSATION CONTEXT: previous ${pairs.length} exchange(s)]:\n${pairs.join("\n\n")}\n\nUse this context to give continuity-aware, non-repetitive feedback.`
    : "";
};

async function fetchAi(payload: Record<string, unknown>) {
  let authToken = "";
  try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
  const res = await fetch("/api/stt/tokens", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
    },
    body:    JSON.stringify({ ...payload, userEmail: getEmail() }),
    signal:  AbortSignal.timeout(35_000),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error("API parse error"); }
  if (res.status === 402 || data.error === "insufficient_credits") {
    window.location.href = "/pricing";
    throw new Error("insufficient_credits");
  }
  if (!res.ok) throw new Error(String(data.error ?? "API error"));
  return data;
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── Score Ring ────────────────────────────────────────────────
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r    = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.card} strokeWidth="6" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={scoreHex(score)} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (score / 10) * circ }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
}

// ── Pulse Bars ────────────────────────────────────────────────
function PulseBars({ active }: { active: boolean }) {
  const heights = [0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6];
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 18 }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          style={{ width: 3, height: "100%", borderRadius: 4, background: T.accent, transformOrigin: "center" }}
          animate={active ? { scaleY: [h, 1, h * 0.3, h] } : { scaleY: 0.2 }}
          transition={active ? { duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" } : {}}
        />
      ))}
    </div>
  );
}

// ── Model Card ────────────────────────────────────────────────
function ModelCard({ model, selected, onSelect }: {
  model: AiModel; selected: boolean; onSelect: () => void;
}) {
  const qualityWidth = { Best: "100%", Great: "75%", Good: "55%", Fast: "40%" }[model.quality];
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: "100%", textAlign: "left", padding: "12px 14px",
        borderRadius: 12, border: `1.5px solid ${selected ? model.color + "55" : T.border}`,
        background: selected ? model.color + "0a" : T.card,
        transition: "all 0.15s", position: "relative", overflow: "hidden",
      }}
    >
      {selected && (
        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: model.color, borderRadius: "3px 0 0 3px" }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{model.icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{model.name}</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
                background: model.color + "15", border: `1px solid ${model.color}40`, color: model.color,
                letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {model.badge}
              </span>
            </div>
            <span style={{ fontSize: 11, color: T.textFaint }}>{model.provider}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: T.success }}>
            <Bolt size={9} /> {model.speed}
          </div>
          <span style={{ fontSize: 10, color: T.textFaint }}>{model.creditsPerQ} cr/Q</span>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: T.border, overflow: "hidden" }}>
          <div style={{ height: "100%", width: qualityWidth, background: model.color, borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 9, color: T.textFaint, fontWeight: 600, width: 28, textAlign: "right" }}>
          {model.quality}
        </span>
      </div>
    </motion.button>
  );
}

// ── Feedback Panel ────────────────────────────────────────────
function FeedbackPanel({ feedback, questionIndex, total }: {
  feedback: Feedback; questionIndex: number; total: number;
}) {
  const s = feedback.score ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}
      className="light-scrollbar"
    >
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, padding: "14px 18px",
        borderBottom: `1px solid ${T.border}`, background: T.panel,
        display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1,
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            AI Evaluation
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginTop: 2 }}>
            Question {questionIndex + 1} of {total}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 52, height: 52 }}>
            <ScoreRing score={s} size={52} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: scoreHex(s) }}>{s}</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: scoreHex(s), textTransform: "uppercase" }}>
              {scoreLabel(s)}
            </p>
            <p style={{ fontSize: 10, color: T.textFaint }}>out of 10</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Strengths */}
        {feedback.strengths?.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ padding: "4px 6px", borderRadius: 8, background: T.successBg, border: `1px solid ${T.success}30` }}>
                <CheckCircle2 size={12} style={{ color: T.success }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.success, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Strengths
              </span>
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {feedback.strengths.map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: T.textMid, lineHeight: 1.55 }}>
                  <span style={{ marginTop: 6, width: 4, height: 4, borderRadius: "50%", background: T.success, flexShrink: 0 }} />
                  {renderSafe(s)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.improvements?.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ padding: "4px 6px", borderRadius: 8, background: T.warnBg, border: `1px solid ${T.warn}30` }}>
                <AlertCircle size={12} style={{ color: T.warn }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.warn, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Areas to Improve
              </span>
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {feedback.improvements.map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: T.textMid, lineHeight: 1.55 }}>
                  <span style={{ marginTop: 6, width: 4, height: 4, borderRadius: "50%", background: T.warn, flexShrink: 0 }} />
                  {renderSafe(s)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ideal response */}
        {feedback.betterAnswerExample && (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: T.accentBg, border: `1px solid ${T.accentBrd}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Target size={12} style={{ color: T.accent }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Ideal Response
              </span>
            </div>
            <p style={{ fontSize: 12, color: T.textMid, lineHeight: 1.65, fontStyle: "italic" }}>
              "{renderSafe(feedback.betterAnswerExample)}"
            </p>
          </div>
        )}

        {/* Resume proof */}
        {feedback.resume_proof && (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, marginBottom: 4 }}>From Your Resume</p>
            <p style={{ fontSize: 11, color: T.textMid, lineHeight: 1.55 }}>{renderSafe(feedback.resume_proof)}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Score Bar Tracker ─────────────────────────────────────────
function ScoreBarTracker({ scores, total, avg }: { scores: number[]; total: number; avg: string }) {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 12, border: `1px solid ${T.border}`,
      background: T.panel, display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        Session
      </span>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
        {scores.map((s, i) => (
          <motion.div key={i}
            title={`Q${i + 1}: ${s}/10`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(s * 10, 8)}%` }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
            style={{
              flex: 1, borderRadius: 3, minHeight: 3,
              background: scoreHex(s),
              opacity: 0.75,
            }}
          />
        ))}
        {Array.from({ length: total - scores.length }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: T.border }} />
        ))}
      </div>
      <span style={{ fontSize: 13, fontWeight: 900, color: scoreHex(parseFloat(avg) || 0) }}>{avg}</span>
    </div>
  );
}

// ── Auth Gate ─────────────────────────────────────────────────
function AuthGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: T.panel, border: `1px solid ${T.border}`, borderRadius: 20,
          padding: "44px 40px", textAlign: "center", maxWidth: 400, width: "100%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
        }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentBg,
          border: `1px solid ${T.accentBrd}`, margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={24} style={{ color: T.accent }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: T.text, marginBottom: 8 }}>
          Sign in to continue
        </h2>
        <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.65, marginBottom: 28 }}>
          Create an account to access mock interviews, structured practice, and AI-powered feedback.
        </p>
        <button onClick={onSignIn}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12, fontWeight: 800, fontSize: 14,
            background: `linear-gradient(135deg, #1C7A3E, #21924A)`, color: "white", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 4px 20px rgba(31,138,62,0.25)",
          }}>
          <LogIn size={16} /> Sign in / Create account
        </button>
        <p style={{ fontSize: 11, color: T.textFaint, marginTop: 16 }}>
          Secure sign-in · Monthly usage shown before you begin
        </p>
      </motion.div>
    </div>
  );
}

// ── Difficulty Card ───────────────────────────────────────────
function DifficultyCard({ opt, selected, onSelect, locked }: {
  opt: (typeof DIFFICULTY_OPTIONS)[0];
  selected: boolean;
  onSelect: () => void;
  locked: boolean;
}) {
  const intensityWidths: Record<string, string> = {
    easy: "28%", medium: "58%", hard: "92%", behavioral: "46%", mixed: "70%",
  };
  const questionTypes: Record<string, [string, string, string]> = {
    easy:       ["Background, strengths, career story",   "Basic technical concepts",          "Simple situational scenarios"],
    medium:     ["Competency and judgment questions",     "Intermediate technical depth",      "Priority and tradeoff decisions"],
    hard:       ["System design at scale",                "Architecture and tradeoff analysis", "Leadership under pressure"],
    behavioral: ["Tell me about a time...",               "Conflict, failure, and growth",      "Culture fit and team dynamics"],
    mixed:      ["Opener + technical + behavioral",       "Mirrors a real interview flow",      "Full distribution across levels"],
  };
  const types   = questionTypes[opt.id] ?? ["", "", ""];
  const barWidth = intensityWidths[opt.id] ?? "50%";
  return (
    <motion.button
      onClick={() => { if (!locked) onSelect(); }}
      whileHover={!locked ? { scale: 1.01 } : {}}
      whileTap={!locked ? { scale: 0.98 } : {}}
      style={{
        width: "100%", textAlign: "left", padding: 0, display: "flex", alignItems: "stretch",
        borderRadius: 12, border: `1.5px solid ${selected ? opt.color + "55" : T.border}`,
        background: selected ? opt.color + "0a" : T.card,
        transition: "all 0.15s",
        cursor: locked ? "default" : "pointer", opacity: locked ? 0.48 : 1,
      }}
    >
      {/* Left accent bar — flex child, no overflow:hidden needed */}
      <div style={{
        width: 3, flexShrink: 0, borderRadius: "10px 0 0 10px",
        background: selected ? opt.color : "transparent",
        transition: "background 0.15s",
      }} />

      {/* Card content */}
      <div style={{ flex: 1, padding: "12px 14px 12px 11px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
          {/* Dot — fixed width, aligned with first line of text */}
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: opt.color,
            display: "block", flexShrink: 0, marginTop: 4,
          }} />
          {/* Label + descriptions — single column, perfectly aligned */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{opt.label}</span>
              {locked && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                  border: `1px solid ${T.border}`, color: T.textFaint }}>
                  Pro+
                </span>
              )}
            </div>
            {types.map((t, i) => (
              <p key={i} style={{ fontSize: 10.5, color: T.textFaint, lineHeight: 1.5, margin: "0 0 2px 0" }}>{t}</p>
            ))}
          </div>
        </div>

        {/* Intensity bar */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 3, background: T.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: barWidth, background: opt.color, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 9, color: T.textFaint, fontWeight: 600, flexShrink: 0 }}>Intensity</span>
        </div>
      </div>
    </motion.button>
  );
}

// ── Difficulty Badge ──────────────────────────────────────────
function DifficultyBadge({ diff, category }: { diff?: Exclude<Difficulty, "mixed">; category?: string }) {
  if (!diff) return null;
  const opt = DIFFICULTY_OPTIONS.find(o => o.id === diff);
  if (!opt) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: opt.bg, border: `1px solid ${opt.brd}`, color: opt.color,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: opt.color, display: "inline-block", flexShrink: 0 }} />
      {opt.label}{category ? ` / ${category}` : ""}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MockInterviewPage() {
  const { notifyFailure } = useToast();

  // ── Auth state ──────────────────────────────────────────────
  const [user, setUser]           = useState<unknown>(null);
  const [authLoading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) setShowAuthModal(true);
    });
    return unsub;
  }, []);

  // ── Phase ────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");

  // ── Session Config ───────────────────────────────────────────
  const [resumeText,   setResumeText]   = useState("");
  const [jdText,       setJdText]       = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [questionCount, setQuestionCount] = useState(10);
  const [showModelPicker,  setShowModelPicker]  = useState(false);
  const [showDiffPicker,   setShowDiffPicker]   = useState(false);
  const [difficulty, setDifficulty]             = useState<Difficulty>("mixed");
  const [taggedQuestions, setTaggedQuestions] = useState<TaggedQuestion[]>([]);
  const [userPlan, setUserPlan]               = useState<string>("free");

  // ── Interview State ──────────────────────────────────────────
  const [questions,    setQuestions]    = useState<string[]>([]);
  const [index,        setIndex]        = useState(0);
  const [answer,       setAnswer]       = useState("");
  const [partial,      setPartial]      = useState("");
  const [feedback,     setFeedback]     = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [scores,       setScores]       = useState<number[]>([]);
  const [history,      setHistory]      = useState<InterviewTurn[]>([]);
  const [responseDurations, setResponseDurations] = useState<number[]>([]);

  // ── UI State ─────────────────────────────────────────────────
  const [isGenerating, setIsGenerating]  = useState(false);
  const [isVerifying,  setIsVerifying]   = useState(false);
  const [verifyResult, setVerifyResult]  = useState("");
  const [isAnalyzing,  setIsAnalyzing]   = useState(false);
  const [isSpeaking,   setIsSpeaking]    = useState(false);
  const [isRecording,  setIsRecording]   = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [ttsEnabled,   setTtsEnabled]    = useState(true);
  const [sessionTime,  setSessionTime]   = useState(0);
  const [activeTab,    setActiveTab]     = useState<"transcript" | "history">("transcript");
  const [credits,      setCredits]       = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // ── Media State ──────────────────────────────────────────────
  const [cameraOn, setCameraOn] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────
  const videoRef           = useRef<HTMLVideoElement>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const wsRef              = useRef<WebSocket | null>(null);
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const smStartedRef       = useRef(false);
  const answerRef          = useRef("");
  const isRecordingRef     = useRef(false);
  const isAnalyzingRef     = useRef(false);
  const silenceTimerRef    = useRef<number | null>(null);
  const sessionTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitAnswerRef    = useRef<(ans?: string) => Promise<void>>();
  const recordingStartedAtRef = useRef<number>(0);

  // ── Derived ──────────────────────────────────────────────────
  const activeModel       = AI_MODELS.find(m => m.id === selectedModel) ?? AI_MODELS[0];
  const activeDiff        = DIFFICULTY_OPTIONS.find(o => o.id === difficulty) ?? DIFFICULTY_OPTIONS[4];
  const estimatedCredits  = activeModel.creditsPerQ * questionCount;
  const maxQ              = PLAN_MAX_QUESTIONS[userPlan] ?? MAX_QUESTIONS_FREE;
  const sliderPct         = Math.round(((questionCount - MIN_QUESTIONS) / Math.max(maxQ - MIN_QUESTIONS, 1)) * 100);
  const currentQ          = questions[index] ?? "Tell me about yourself.";
  const totalQ            = questions.length || 1;
  const progress          = ((index + 1) / totalQ) * 100;
  const avgScore          = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : " - ";
  const sessionReport     = analyzeInterviewTurns(history, responseDurations);

  // ── Sync refs ────────────────────────────────────────────────
  useEffect(() => { isRecordingRef.current  = isRecording;  }, [isRecording]);
  useEffect(() => { isAnalyzingRef.current  = isAnalyzing;  }, [isAnalyzing]);

  // ── Credits (preflight phase) ─────────────────────────────
  useEffect(() => {
    if (phase !== "ready") return;
    setLoadingCredits(true);
    fetchCredits()
      .then(d => { setCredits(d?.credits ?? d?.balance ?? null); if (d?.plan) setUserPlan(d.plan); })
      .catch(() => setCredits(null))
      .finally(() => setLoadingCredits(false));
  }, [phase]);

  // ── User plan (for difficulty / count gating) ────────────
  useEffect(() => {
    if (!user) return;
    fetchCredits()
      .then(d => { if (d?.plan) setUserPlan(d.plan); })
      .catch(() => {});
  }, [user]);

  // ── Clamp question count when plan is known ───────────────
  useEffect(() => {
    const max = PLAN_MAX_QUESTIONS[userPlan] ?? MAX_QUESTIONS_FREE;
    if (questionCount > max) setQuestionCount(max);
  }, [userPlan]);

  // ── Reset difficulty if no longer accessible ──────────────
  useEffect(() => {
    const accessible = PLAN_DIFFICULTY_ACCESS[userPlan] ?? PLAN_DIFFICULTY_ACCESS["free"];
    if (!accessible.includes(difficulty)) setDifficulty("mixed");
  }, [userPlan]);

  // ── Session timer ─────────────────────────────────────────
  useEffect(() => {
    if (phase === "interview") {
      sessionTimerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [phase]);

  // ── Camera ────────────────────────────────────────────────
  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraOn(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = s;
        setCameraOn(true);
      } catch { setCameraOn(false); }
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // ── Silence timer ─────────────────────────────────────────
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  // ── Stop recording ────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    smStartedRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ message: "EndOfStream" }));
    wsRef.current?.close(); wsRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
    setPartial("");
  }, [clearSilenceTimer]);

  // ── Reset silence timer ───────────────────────────────────
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (answerRef.current.trim().length > 10) {
        stopRecording();
        submitAnswerRef.current?.(answerRef.current);
      }
    }, SILENCE_DELAY_MS);
  }, [clearSilenceTimer, stopRecording]);

  // ── Start recording (Speechmatics) ────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isAnalyzingRef.current || wsRef.current) return;
    setRecordingError(null);
    try {
      const tokenRes = await fetch(`/api/stt/tokens?email=${encodeURIComponent(getEmail())}`, { method: "GET" });
      if (!tokenRes.ok) {
        console.error(`[Replysis] Mock interview token request failed status=${tokenRes.status}`);
        setRecordingError(LISTENING_UNAVAILABLE);
        return;
      }
      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        console.error("[Replysis] Mock interview token rejected");
        setRecordingError(LISTENING_UNAVAILABLE);
        return;
      }
      const token = tokenData.token ?? tokenData.key ?? tokenData.jwt;
      if (!token) {
        console.error("[Replysis] Mock interview token response contained no credential");
        setRecordingError(LISTENING_UNAVAILABLE);
        return;
      }

      let wsClosedPrematurely = false;
      const smHost = process.env.NEXT_PUBLIC_SPEECHMATICS_RT_HOST ?? "eu.rt.speechmatics.com";
      const ws = new WebSocket(`wss://${smHost}/v2/en?jwt=${token}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      // Detect premature close (expired/invalid key)
      const connectTimeout = window.setTimeout(() => {
        if (!smStartedRef.current) {
          wsClosedPrematurely = true;
          ws.close();
          console.error("[Replysis] Mock interview transcription refused the credential");
          setRecordingError(LISTENING_UNAVAILABLE);
          isRecordingRef.current = false; setIsRecording(false); wsRef.current = null;
        }
      }, 5000);

      ws.onopen = () => ws.send(JSON.stringify({
        message: "StartRecognition",
        audio_format: { type: "file" },
        transcription_config: { language: "en", operating_point: "enhanced", enable_partials: true },
      }));

      ws.onmessage = async (e) => {
        if (typeof e.data !== "string") return;
        let msg: any;
        try { msg = JSON.parse(e.data); } catch { return; } // ignore any non-JSON frame instead of throwing

        if (msg.message === "RecognitionStarted") {
          window.clearTimeout(connectTimeout);
          smStartedRef.current = true; isRecordingRef.current = true; setIsRecording(true);
          recordingStartedAtRef.current = Date.now();
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = async (ev) => {
              if (ev.data.size > 0 && ws.readyState === WebSocket.OPEN && smStartedRef.current)
                ws.send(await ev.data.arrayBuffer());
            };
            recorder.start(250);
          } catch (mediaErr) {
            setRecordingError(MIC_BLOCKED);
            wsRef.current?.close(); wsRef.current = null;
            isRecordingRef.current = false; setIsRecording(false); smStartedRef.current = false;
          }
        }
        if (msg.message === "AddTranscript" && msg.metadata?.transcript) {
          answerRef.current = (answerRef.current + " " + msg.metadata.transcript).trim();
          setAnswer(answerRef.current); setPartial(""); resetSilenceTimer();
        }
        if (msg.message === "AddPartialTranscript" && msg.metadata?.transcript) {
          setPartial(msg.metadata.transcript); resetSilenceTimer();
        }
        if (msg.message === "Error") {
          window.clearTimeout(connectTimeout);
          console.error(`[Replysis] Mock interview transcription error type=${msg.type ?? "unknown"}`);
          setRecordingError(LISTENING_UNAVAILABLE);
          stopRecording();
        }
      };
      ws.onerror = () => {
        window.clearTimeout(connectTimeout);
        console.error("[Replysis] Mock interview transcription socket error");
        if (!wsClosedPrematurely) setRecordingError(LISTENING_UNAVAILABLE);
        stopRecording();
      };
      ws.onclose = (ev) => {
        window.clearTimeout(connectTimeout);
        if (!smStartedRef.current && !wsClosedPrematurely) {
          console.error(`[Replysis] Mock interview transcription closed before start code=${ev.code}`);
          setRecordingError(LISTENING_UNAVAILABLE);
        }
        isRecordingRef.current = false; setIsRecording(false); smStartedRef.current = false; wsRef.current = null;
      };
    } catch (err) {
      console.error("[Replysis] Mock interview recording failed to start:", (err as Error)?.name ?? "Error");
      setRecordingError(
        (err as Error)?.name === "NotAllowedError"
          ? MIC_BLOCKED
          : LISTENING_UNAVAILABLE,
      );
      isRecordingRef.current = false; setIsRecording(false);
    }
  }, [stopRecording, resetSilenceTimer]);

  // ── Submit answer ─────────────────────────────────────────
  const submitAnswer = useCallback(async (finalAns?: string) => {
    const ans = (finalAns ?? answerRef.current ?? "").trim();
    if (ans.length < 5 || isAnalyzingRef.current) return;
    const measuredResponseSecs = recordingStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
      : 0;
    recordingStartedAtRef.current = 0;
    if (measuredResponseSecs > 0) setResponseDurations(previous => [...previous, measuredResponseSecs]);
    stopRecording();
    window.speechSynthesis.cancel();
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    const question   = questions[index] ?? "Tell me about yourself.";
    const newHistory: InterviewTurn[] = [
      ...history,
      { role: "interviewer", text: question },
      { role: "candidate",   text: ans },
    ];
    setHistory(newHistory);

    // Build memory context from previous turns (injected into prompt)
    const contextBlock = buildContextBlock(history);

    try {
      const isTooShort = ans.split(/\s+/).length < 5;
      const mode = isTooShort ? "generate_script" : "generate_feedback";
      const res = await fetchAi({
        mode,
        question,
        answer:              ans,
        resume:              resumeText,
        jd:                  jdText,
        model:               selectedModel,
        conversationHistory: newHistory,
        contextBlock,        // memory context for the AI prompt
      }) as Feedback & { betterAnswerExample?: string };

      if (isTooShort) {
        setFeedback({
          score:              0,
          strengths:          [],
          improvements:       ["Your answer was too short. Aim for 2 to 3 full sentences with specific examples."],
          betterAnswerExample: res?.betterAnswerExample ?? "",
        });
      } else {
        setFeedback(res as Feedback);
      }
      setScores(prev => [...prev, (res as Feedback)?.score ?? 0]);
    } catch {
      setFeedback({ score: 0, strengths: [], improvements: ["Error getting feedback. Please try again."], betterAnswerExample: "" });
    }

    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
    setShowFeedback(true);
  }, [stopRecording, questions, index, history, resumeText, jdText, selectedModel]);

  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);

  // ── TTS ───────────────────────────────────────────────────
  const speakQuestion = useCallback((text: string) => {
    if (!ttsEnabled) { setTimeout(() => startRecording(), 300); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate   = 0.95;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => { setIsSpeaking(false); setTimeout(() => startRecording(), 800); };
    utter.onerror = () => { setIsSpeaking(false); setTimeout(() => startRecording(), 300); };
    window.speechSynthesis.speak(utter);
  }, [ttsEnabled, startRecording]);

  // ── Navigation ────────────────────────────────────────────
  const nextQuestion = () => {
    const next = index + 1;
    if (next >= questions.length) { setPhase("summary"); return; }
    setIndex(next);
    setAnswer(""); answerRef.current = "";
    setPartial(""); setFeedback(null); setShowFeedback(false);
    setTimeout(() => speakQuestion(questions[next]), 500);
  };

  // ── Generate questions ─────────────────────────────────────
  const handleGenerate = async () => {
    if (!resumeText.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetchAi({
        mode: "generate_questions",
        resume: resumeText, jd: jdText, model: selectedModel,
        count: questionCount, num_questions: questionCount,
        difficulty,
      });
      const qs = normalizeQuestions(res);
      if (qs.length === 0) {
        notifyFailure("ai", handleGenerate);
        setIsGenerating(false); return;
      }
      const deduped  = Array.from(new Set(qs.map(q => q.trim()))).filter(Boolean);
      const shuffled = shuffle(deduped.filter(q => q.toLowerCase() !== "tell me about yourself."));
      const final    = ["Tell me about yourself.", ...shuffled].slice(0, questionCount);
      setQuestions(final);
      setTaggedQuestions(tagQuestions(final, difficulty));
      setPhase("ready");
    } catch (err) {
      if (String(err) !== "Error: insufficient_credits")
        notifyFailure("ai", handleGenerate);
    }
    setIsGenerating(false);
  };

  // ── Verify resume ──────────────────────────────────────────
  const handleVerify = async () => {
    if (resumeText.length < 50) return;
    setIsVerifying(true); setVerifyResult("");
    try {
      const data = await fetchAi({ mode: "verify_resume", resume: resumeText, jd: jdText || "N/A" });
      setVerifyResult(String((data as Record<string, unknown>)?.summary ?? "No summary returned."));
    } catch { setVerifyResult("Verification failed. Please try again."); }
    setIsVerifying(false);
  };

  // ── Start interview ────────────────────────────────────────
  const startInterview = () => {
    setPhase("interview"); setIndex(0);
    setAnswer(""); answerRef.current = "";
    setScores([]); setHistory([]); setResponseDurations([]);
    setFeedback(null); setShowFeedback(false); setSessionTime(0);
    setTimeout(() => speakQuestion(questions[0] ?? "Tell me about yourself."), 500);
  };

  // ── File upload ────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "txt") {
        setResumeText(await file.text());
      } else if (ext === "docx" || ext === "doc") {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        if (result.value?.trim()) setResumeText(result.value);
        else notifyFailure("upload");
      } else if (ext === "pdf") {
        const buf  = await file.arrayBuffer();
        const task = pdfjsLib.getDocument({ data: buf, useSystemFonts: true, disableFontFace: true });
        const pdf  = await task.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page    = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((it: unknown) => (it as { str: string }).str).join(" ") + "\n";
        }
        if (fullText.trim()) setResumeText(fullText);
        else notifyFailure("upload");
      } else {
        notifyFailure("upload");
      }
    } catch { notifyFailure("upload"); }
    e.target.value = "";
  };

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      stopRecording();
      window.speechSynthesis.cancel();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [stopRecording]);

  // ── Auth loading ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} style={{ color: T.accent, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!user && showAuthModal) {
    return (
      <AuthGate onSignIn={() => {
        window.location.href = "/login?redirect=/mock-interview";
      }} />
    );
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: T.panel, borderBottom: `1px solid ${T.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <div style={{ maxWidth: 1380, margin: "0 auto", padding: "0 24px",
          height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandIcon size={30} />
            <span style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>Replysis</span>
            <span style={{ fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 6,
              background: T.accentBg, border: `1px solid ${T.accentBrd}`, color: T.accent,
              letterSpacing: "0.12em", textTransform: "uppercase" }}>AI</span>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {(["setup","ready","interview","summary"] as Phase[]).map((p, i) => {
              const labels = ["Configure", "Preflight", "Interview", "Analytics"];
              const isActive = phase === p;
              const isPast   = ["setup","ready","interview","summary"].indexOf(phase) > i;
              return (
                <div key={p} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: isActive ? `1.5px solid ${T.accentBrd}` : "1.5px solid transparent",
                    background: isActive ? T.accentBg : "transparent",
                    color: isActive ? T.accent : isPast ? T.success : T.textFaint,
                    transition: "all 0.2s",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900,
                      background: isActive ? T.accent : isPast ? T.successBg : T.card,
                      color: isActive ? "white" : isPast ? T.success : T.textFaint,
                      border: `1px solid ${isActive ? T.accent : isPast ? T.success + "50" : T.border}`,
                    }}>
                      {isPast ? <CheckCircle2 size={10} /> : i + 1}
                    </div>
                    <span className="hidden lg:inline">{labels[i]}</span>
                  </div>
                  {i < 3 && <div style={{ width: 20, height: 1, background: T.border, margin: "0 2px" }} />}
                </div>
              );
            })}
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {phase === "interview" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  borderRadius: 8, border: `1px solid ${T.border}`, background: T.card,
                  fontSize: 12, fontWeight: 600, color: T.textMid, fontFamily: "monospace" }}>
                  <Clock size={12} style={{ color: T.textFaint }} /> {formatTime(sessionTime)}
                </div>
                {scores.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                    borderRadius: 8, border: `1px solid ${T.border}`, background: T.card,
                    fontSize: 12, fontWeight: 700, color: T.textMid }}>
                    <Star size={12} style={{ color: "#f59e0b" }} /> {avgScore} avg
                  </div>
                )}
                <button
                  onClick={() => { stopRecording(); window.speechSynthesis.cancel(); setPhase("summary"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: T.dangerBg, border: `1px solid ${T.danger}30`, color: T.danger,
                  }}>
                  <PhoneOff size={13} /> End Session
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar (interview phase) */}
        {phase === "interview" && (
          <div style={{ height: 2, background: T.border }}>
            <motion.div style={{ height: "100%", background: `linear-gradient(90deg, ${T.accent}, #21924A)` }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
          </div>
        )}
      </nav>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "28px 24px" }}>
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════════
              SETUP PHASE
          ══════════════════════════════════════════════════════ */}
          {phase === "setup" && (
            <motion.div key="setup"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, maxWidth: 960, margin: "0 auto" }}
              className="setup-grid"
            >
              {/* LEFT */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Header */}
                <div style={{ marginBottom: 4 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1.15,
                    letterSpacing: "-0.025em", marginBottom: 8 }}>
                    Mock Interview
                  </h1>
                  <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.6, maxWidth: 420 }}>
                    Paste your resume and optionally a job description. The interviewer will ask questions drawn from your actual experience.
                  </p>
                </div>

                {/* Resume card */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ padding: "7px 8px", borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBrd}` }}>
                        <FileText size={14} style={{ color: T.accent }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Resume / CV</p>
                        <p style={{ fontSize: 11, color: T.textFaint }}>Paste full text or upload .txt / .docx / .pdf</p>
                      </div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                      borderRadius: 8, border: `1px solid ${T.border}`, background: T.card,
                      fontSize: 11, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>
                      <input type="file" onChange={handleFile} style={{ display: "none" }} accept=".txt,.doc,.docx,.pdf" />
                      Upload File
                    </label>
                  </div>
                  <textarea
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste your complete resume here: work experience, skills, education, achievements..."
                    style={{ width: "100%", height: 200, padding: "16px 18px", fontSize: 13, color: T.text,
                      background: "transparent", border: "none", outline: "none", resize: "none",
                      lineHeight: 1.65, boxSizing: "border-box", caretColor: T.accent }}
                    className="light-scrollbar"
                  />
                  {resumeText.length > 50 && (
                    <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.border}` }}>
                      <button onClick={handleVerify} disabled={isVerifying}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                          fontWeight: 600, color: T.success, background: "none", border: "none",
                          cursor: "pointer", opacity: isVerifying ? 0.6 : 1 }}>
                        {isVerifying ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={13} />}
                        {isVerifying ? "Analyzing profile..." : "Run profile analysis"}
                      </button>
                      {verifyResult && (
                        <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10,
                          background: T.successBg, border: `1px solid ${T.success}30`,
                          fontSize: 12, color: T.textMid, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                          {verifyResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* JD card */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ padding: "7px 8px", borderRadius: 10, background: "rgba(31,138,62,0.07)", border: "1px solid rgba(31,138,62,0.18)" }}>
                      <Briefcase size={14} style={{ color: "#21924A" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Job Description</p>
                      <p style={{ fontSize: 11, color: T.textFaint }}>Optional · Strongly recommended for targeted questions</p>
                    </div>
                  </div>
                  <textarea
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                    placeholder="Paste the target job description to calibrate interview difficulty and domain-specific questions..."
                    style={{ width: "100%", height: 140, padding: "16px 18px", fontSize: 13, color: T.text,
                      background: "transparent", border: "none", outline: "none", resize: "none",
                      lineHeight: 1.65, boxSizing: "border-box", caretColor: "#21924A" }}
                    className="light-scrollbar"
                  />
                </div>
              </div>

              {/* RIGHT SIDEBAR */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* AI Model picker */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel, overflow: "hidden" }}>
                  <button onClick={() => setShowModelPicker(v => !v)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ padding: "7px 8px", borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBrd}` }}>
                        <Cpu size={14} style={{ color: T.accent }} />
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AI Model</p>
                        <p style={{ fontSize: 11, color: T.textFaint }}>
                          {activeModel.name} · {activeModel.speed}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={15} style={{ color: T.textFaint,
                      transform: showModelPicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                  <AnimatePresence>
                    {showModelPicker && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ overflow: "hidden", borderTop: `1px solid ${T.border}` }}>
                        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6,
                          maxHeight: 280, overflowY: "auto" }} className="light-scrollbar">
                          {AI_MODELS.map(m => (
                            <ModelCard key={m.id} model={m} selected={selectedModel === m.id}
                              onSelect={() => { setSelectedModel(m.id); setShowModelPicker(false); }} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Difficulty picker - same accordion style as AI Model */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel, overflow: "hidden" }}>
                  <button onClick={() => setShowDiffPicker(v => !v)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ padding: "7px 8px", borderRadius: 10, background: activeDiff.bg, border: `1px solid ${activeDiff.brd}` }}>
                        <Target size={14} style={{ color: activeDiff.color }} />
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Difficulty</p>
                        <p style={{ fontSize: 11, color: T.textFaint }}>
                          {activeDiff.label} · {activeDiff.sub}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={15} style={{ color: T.textFaint,
                      transform: showDiffPicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                  <AnimatePresence>
                    {showDiffPicker && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ overflow: "hidden", borderTop: `1px solid ${T.border}` }}>
                        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6,
                          maxHeight: 380, overflowY: "auto" }} className="light-scrollbar">
                          {DIFFICULTY_OPTIONS.map(opt => {
                            const planOrder: Record<string, number> = { free: 0, pro: 1, max: 1, lifetime: 1, teams: 1 };
                            const locked = (planOrder[userPlan] ?? 0) < (planOrder[opt.planRequired] ?? 0);
                            return (
                              <DifficultyCard key={opt.id} opt={opt} selected={difficulty === opt.id} locked={locked}
                                onSelect={() => { setDifficulty(opt.id); setShowDiffPicker(false); }} />
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Question count slider */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ padding: "7px 8px", borderRadius: 10, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
                      <Gauge size={14} style={{ color: T.warn }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Question Count</p>
                      <p style={{ fontSize: 11, color: T.textFaint }}>Drag to set session depth</p>
                    </div>
                    <div style={{
                      minWidth: 42, textAlign: "center", padding: "4px 10px",
                      background: T.accentBg, border: `1px solid ${T.accentBrd}`,
                      borderRadius: 8, fontSize: 18, fontWeight: 900, color: T.accent, lineHeight: 1.2,
                    }}>
                      {questionCount}
                    </div>
                  </div>

                  {/* Slider */}
                  <div style={{ padding: "2px 0 4px" }}>
                    <input
                      type="range"
                      min={MIN_QUESTIONS}
                      max={maxQ}
                      value={questionCount}
                      onChange={e => setQuestionCount(Number(e.target.value))}
                      className="cx-slider"
                      style={{
                        width: "100%",
                        background: `linear-gradient(to right, #1C7A3E 0%, #1C7A3E ${sliderPct}%, ${T.border} ${sliderPct}%, ${T.border} 100%)`,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span style={{ fontSize: 9.5, color: T.textFaint, fontWeight: 600 }}>{MIN_QUESTIONS}</span>
                      {userPlan !== "pro" && (
                        <span style={{ fontSize: 9, color: T.textFaint, fontWeight: 500 }}>
                          {userPlan === "free" ? "Basic: up to 20, Pro: up to 50" : "Pro: up to 50"}
                        </span>
                      )}
                      <span style={{ fontSize: 9.5, color: T.textFaint, fontWeight: 600 }}>{maxQ}</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "11px 0 0", borderTop: `1px solid ${T.border}`, marginTop: 10,
                  }}>
                    {[
                      { label: "Est. Time", value: `~${Math.round(questionCount * 2.5)} min` },
                      { label: "Questions", value: `${questionCount}`                        },
                      { label: "Credits",   value: `~${estimatedCredits}`                   },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 15, fontWeight: 900, color: T.text, lineHeight: 1 }}>{value}</p>
                        <p style={{ fontSize: 9.5, color: T.textFaint, marginTop: 3 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.panel, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase",
                    letterSpacing: "0.08em", marginBottom: 10 }}>Before you start</p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[
                      "Quiet room gives better transcription results",
                      "Keep answers to 1-3 minutes; use STAR for behavioral questions",
                      "3.5 s of silence auto-submits your answer",
                    ].map((tip, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, color: T.textMid, lineHeight: 1.5 }}>
                        <span style={{ marginTop: 2, width: 4, height: 4, borderRadius: "50%", flexShrink: 0, background: T.textFaint, display: "inline-block" }} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <motion.button
                  onClick={handleGenerate}
                  disabled={isGenerating || !resumeText.trim()}
                  whileHover={!isGenerating && resumeText.trim() ? { scale: 1.01 } : {}}
                  whileTap={!isGenerating && resumeText.trim() ? { scale: 0.99 } : {}}
                  style={{
                    width: "100%", padding: "13px 0", borderRadius: 12,
                    fontSize: 13.5, fontWeight: 700, border: "none", cursor: resumeText.trim() ? "pointer" : "not-allowed",
                    background: !resumeText.trim() || isGenerating
                      ? T.border
                      : "#1C7A3E",
                    color: !resumeText.trim() || isGenerating ? T.textFaint : "white",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.15s",
                  }}>
                  {isGenerating
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Building {questionCount} questions...</>
                    : <>Start session</>}
                </motion.button>
                <p style={{ textAlign: "center", fontSize: 10, color: T.textFaint }}>
                  Audio stays on your device. Transcripts are not stored.
                </p>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              PREFLIGHT PHASE
          ══════════════════════════════════════════════════════ */}
          {phase === "ready" && (
            <motion.div key="ready"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }}
              style={{ maxWidth: 940, margin: "0 auto" }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-0.02em", marginBottom: 6 }}>
                  Ready to start
                </h2>
                <p style={{ fontSize: 13, color: T.textMid }}>
                  {questions.length} questions prepared with {activeModel.name}. Check your camera and mic below.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 20 }} className="preflight-grid">
                {/* Camera + toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ aspectRatio: "16/9", borderRadius: 16, overflow: "hidden",
                    border: `1px solid ${T.border}`, background: T.card, position: "relative" }}>
                    {cameraOn
                      ? <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                      : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <CameraOff size={32} style={{ color: T.border }} />
                          <p style={{ fontSize: 12, color: T.textFaint }}>Camera disabled</p>
                        </div>
                    }
                    <div style={{
                      position: "absolute", top: 10, left: 10, padding: "4px 10px", borderRadius: 20,
                      background: "rgba(255,255,255,0.85)", border: `1px solid ${T.border}`,
                      backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 5,
                      fontSize: 10, fontWeight: 700, color: cameraOn ? T.success : T.danger,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: cameraOn ? T.success : T.danger }} />
                      {cameraOn ? "Camera On" : "Camera Off"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: cameraOn ? "Camera On" : "Enable Camera", icon: cameraOn ? Camera : CameraOff,
                        active: cameraOn, onClick: toggleCamera, color: cameraOn ? T.success : T.danger },
                      { label: ttsEnabled ? "Audio On" : "Audio Off", icon: ttsEnabled ? Volume2 : VolumeX,
                        active: ttsEnabled, onClick: () => setTtsEnabled(!ttsEnabled), color: ttsEnabled ? T.success : T.warn },
                    ].map(({ label, icon: Icon, active, onClick, color }) => (
                      <button key={label} onClick={onClick}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                          padding: "11px 0", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                          border: `1.5px solid ${active ? color + "40" : T.border}`,
                          background: active ? color + "08" : T.card,
                          color: active ? color : T.textMid, cursor: "pointer", transition: "all 0.15s" }}>
                        <Icon size={15} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status + CTA */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Credits */}
                  <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.panel,
                    padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ padding: "8px 9px", borderRadius: 10, background: T.warnBg, border: `1px solid ${T.warn}30` }}>
                        <Coins size={15} style={{ color: T.warn }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>Credits Remaining</p>
                        <p style={{ fontSize: 20, fontWeight: 900, color: T.warn, lineHeight: 1.1, marginTop: 2 }}>
                          {loadingCredits
                            ? <Loader2 size={15} style={{ display: "inline", animation: "spin 1s linear infinite" }} />
                            : credits !== null ? credits.toLocaleString() : "0"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 10, color: T.textFaint, marginBottom: 4 }}>This session needs</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                        <Flame size={12} style={{ color: "#2E8B45" }} />
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#2E8B45" }}>~{estimatedCredits}</span>
                        <span style={{ fontSize: 11, color: T.textFaint }}>credits</span>
                      </div>
                      {credits !== null && credits < estimatedCredits && (
                        <p style={{ fontSize: 10, color: T.danger, marginTop: 4, fontWeight: 700 }}>⚠ Insufficient credits</p>
                      )}
                    </div>
                  </div>

                  {/* Config summary */}
                  <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.panel, overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Session Configuration
                      </p>
                    </div>
                    {[
                      { label: "AI Model",   value: `${activeModel.name}`, sub: activeModel.provider, ok: true },
                      { label: "Speed",      value: activeModel.speed,  sub: "avg response",   ok: true },
                      { label: "Difficulty", value: DIFFICULTY_OPTIONS.find(d => d.id === difficulty)?.label ?? "Mixed", sub: undefined, ok: true },
                      { label: "Questions",  value: `${questions.length} prepared`, sub: `of ${questionCount} requested`, ok: questions.length >= questionCount * 0.8 },
                      { label: "Camera",     value: cameraOn ? "Connected" : "Disabled", ok: cameraOn },
                      { label: "AI Voice",   value: ttsEnabled ? "Enabled" : "Muted",   ok: ttsEnabled },
                      { label: "Microphone", value: "Ready",    ok: true },
                      { label: "Memory AI",  value: `Last ${CONTEXT_HISTORY_TURNS} turns`, sub: "context-aware", ok: true },
                    ].map(({ label, value, sub, ok }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 13, color: T.textMid }}>{label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {sub && <span style={{ fontSize: 10, color: T.textFaint }}>{sub}</span>}
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? T.success : T.warn }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: ok ? T.success : T.warn }}>{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mini stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { label: "Questions",  value: questions.length.toString(), color: T.accent },
                      { label: "Difficulty", value: DIFFICULTY_OPTIONS.find(d => d.id === difficulty)?.label ?? "Mixed", color: DIFFICULTY_OPTIONS.find(d => d.id === difficulty)?.color ?? T.accent },
                      { label: "AI Speed",   value: activeModel.speed, color: "#21924A" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ padding: "12px 8px", borderRadius: 12, textAlign: "center",
                        border: `1px solid ${T.border}`, background: T.card }}>
                        <p style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</p>
                        <p style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  <motion.button onClick={startInterview}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    style={{ width: "100%", padding: "14px 0", borderRadius: 14, fontWeight: 800,
                      fontSize: 15, border: "none", cursor: "pointer", color: "white",
                      background: "linear-gradient(135deg, #1C7A3E, #21924A)",
                      boxShadow: "0 6px 24px rgba(31,138,62,0.30)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Play size={17} fill="white" /> Begin Interview
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              INTERVIEW PHASE
          ══════════════════════════════════════════════════════ */}
          {phase === "interview" && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18,
                height: "calc(100vh - 112px)", minHeight: 580 }}
              className="interview-grid">

              {/* LEFT: Interview room */}
              <div style={{ display: "flex", flexDirection: "column", borderRadius: 18,
                border: `1px solid ${T.border}`, overflow: "hidden", background: T.panel }}>
                {/* Room header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 16px", borderBottom: `1px solid ${T.border}`, background: T.card }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {["#ef4444","#f59e0b","#22c55e"].map(c => (
                        <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.5 }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textFaint }}>
                      Interview · {activeModel.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: T.textFaint }}>
                      <Clock size={10} style={{ display: "inline", marginRight: 4 }} />{formatTime(sessionTime)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>
                      {index + 1} / {totalQ}
                    </span>
                  </div>
                </div>

                {/* AI Robot area */}
                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center",
                  justifyContent: "center", overflow: "hidden", background: "#f8f9fc" }}>
                  <AiRobot3D isSpeaking={isSpeaking} />

                  {/* Speaking badge */}
                  <AnimatePresence>
                    {isSpeaking && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center",
                          gap: 8, padding: "7px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.95)", border: `1px solid ${T.border}`,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", backdropFilter: "blur(8px)" }}>
                        <PulseBars active={isSpeaking} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.accent,
                          textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Speaking</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Camera PiP */}
                  {cameraOn && (
                    <div style={{ position: "absolute", top: 14, right: 14, width: 160, aspectRatio: "16/9",
                      borderRadius: 12, overflow: "hidden", border: `2px solid ${T.border}`,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                      <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                      <div style={{ position: "absolute", bottom: 5, left: 7, fontSize: 9, fontWeight: 700,
                        color: "white", background: "rgba(0,0,0,0.55)", padding: "2px 6px", borderRadius: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444",
                          display: "inline-block", marginRight: 3 }} />
                        You
                      </div>
                    </div>
                  )}
                </div>

                {/* Recording error banner */}
                <AnimatePresence>
                  {recordingError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ borderTop: `1px solid ${T.danger}30`, background: T.dangerBg,
                        padding: "10px 16px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <AlertCircle size={14} style={{ color: T.danger, flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: T.danger, fontWeight: 600, lineHeight: 1.5 }}>
                          {recordingError}
                        </p>
                      </div>
                      <button onClick={() => setRecordingError(null)}
                        style={{ fontSize: 16, color: T.textFaint, background: "none", border: "none",
                          cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Controls */}
                <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}`, background: T.panel }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    {/* Left controls */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { icon: cameraOn ? Camera : CameraOff, active: cameraOn, onClick: toggleCamera, label: "Camera" },
                        { icon: ttsEnabled ? Volume2 : VolumeX, active: ttsEnabled, onClick: () => setTtsEnabled(!ttsEnabled), label: "Audio" },
                      ].map(({ icon: Icon, active, onClick, label }) => (
                        <button key={label} onClick={onClick} title={label}
                          style={{ padding: "9px 10px", borderRadius: 10, transition: "all 0.15s", cursor: "pointer",
                            border: `1.5px solid ${active ? T.border : T.warn + "50"}`,
                            background: active ? T.card : T.warnBg,
                            color: active ? T.textMid : T.warn }}>
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>

                    {/* Main action button */}
                    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                      {!showFeedback ? (
                        <motion.button
                          onClick={() => isRecording ? stopRecording() : startRecording()}
                          disabled={isAnalyzing}
                          whileHover={!isAnalyzing ? { scale: 1.03 } : {}}
                          whileTap={!isAnalyzing ? { scale: 0.97 } : {}}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "11px 26px", borderRadius: 12, fontWeight: 800, fontSize: 13.5,
                            cursor: isAnalyzing ? "not-allowed" : "pointer",
                            opacity: isAnalyzing ? 0.5 : 1, transition: "all 0.2s", position: "relative",
                            background: isRecording
                              ? "rgba(220,38,38,0.08)"
                              : `linear-gradient(135deg, #1C7A3E, #21924A)`,
                            color: isRecording ? T.danger : "white",
                            border: isRecording ? `1.5px solid ${T.danger}40` : "1.5px solid transparent",
                            boxShadow: isRecording ? "none" : "0 4px 16px rgba(31,138,62,0.28)",
                          } as React.CSSProperties}>
                          {isAnalyzing
                            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Analyzing...</>
                            : isRecording
                              ? <><MicOff size={16} /> Stop Recording</>
                              : <><Mic size={16} /> Tap to Answer</>}
                          {isRecording && (
                            <motion.div
                              animate={{ opacity: [0.2, 0.05, 0.2] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              style={{ position: "absolute", inset: 0, borderRadius: 12,
                                background: "rgba(220,38,38,0.15)", pointerEvents: "none" }}
                            />
                          )}
                        </motion.button>
                      ) : (
                        <motion.button onClick={nextQuestion}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 26px",
                            borderRadius: 12, fontWeight: 800, fontSize: 13.5, border: "none",
                            cursor: "pointer", color: "white",
                            background: `linear-gradient(135deg, ${T.success}, #0d9488)`,
                            boxShadow: `0 4px 16px ${T.success}40` }}>
                          {index + 1 >= questions.length
                            ? <><Award size={16} /> Finish & View Report</>
                            : <><SkipForward size={16} /> Next Question</>}
                        </motion.button>
                      )}
                    </div>

                    {/* Manual submit */}
                    <div style={{ width: 40 }}>
                      {answer.length > 5 && !showFeedback && (
                        <button onClick={() => submitAnswer()} disabled={isAnalyzing} title="Submit answer"
                          style={{ padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${T.success}40`,
                            background: T.successBg, color: T.success, cursor: "pointer", opacity: isAnalyzing ? 0.4 : 1 }}>
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recording hint */}
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} style={{ marginTop: 10, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.danger, animation: "pulse 1.2s infinite" }} />
                          <span style={{ fontSize: 11, color: T.textMid }}>
                            Recording · Auto-submits after {SILENCE_DELAY_MS / 1000}s of silence
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT: Analysis panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>
                {/* Question card */}
                <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.panel,
                  padding: "14px 16px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Question {index + 1} of {totalQ}
                      </span>
                      {taggedQuestions[index] && (
                        <DifficultyBadge
                          diff={taggedQuestions[index].difficulty}
                          category={taggedQuestions[index].category}
                        />
                      )}
                      {jdText && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                          background: "rgba(31,138,62,0.07)", border: "1px solid rgba(31,138,62,0.2)", color: "#21924A",
                          textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Role-Specific
                        </span>
                      )}
                    </div>
                    {/* Status pill */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
                      fontSize: 10, fontWeight: 700, border: `1px solid`,
                      borderColor: isRecording ? T.danger + "40" : isAnalyzing ? T.warn + "40" : showFeedback ? T.success + "40" : T.border,
                      background: isRecording ? T.dangerBg : isAnalyzing ? T.warnBg : showFeedback ? T.successBg : T.card,
                      color: isRecording ? T.danger : isAnalyzing ? T.warn : showFeedback ? T.success : T.textFaint,
                    }}>
                      {isRecording  && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.danger, animation: "pulse 1s infinite" }} />}
                      {isAnalyzing  && <Loader2 size={9} style={{ animation: "spin 1s linear infinite" }} />}
                      {showFeedback && <CheckCircle2 size={9} />}
                      {isRecording ? "Recording" : isAnalyzing ? "Analyzing" : showFeedback ? "Evaluated" : "Standby"}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.55 }}>{currentQ}</p>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12,
                  border: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
                  {(["transcript", "history"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 700,
                        border: activeTab === tab ? `1px solid ${T.border}` : "1px solid transparent",
                        background: activeTab === tab ? T.panel : "transparent",
                        color: activeTab === tab ? T.text : T.textFaint, cursor: "pointer",
                        transition: "all 0.15s" }}>
                      {tab === "transcript" ? "Live Transcript" : "Conversation"}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, borderRadius: 14, border: `1px solid ${T.border}`,
                  background: T.panel, overflow: "hidden", minHeight: 0 }}>
                  {activeTab === "transcript" && (
                    !showFeedback ? (
                      <div style={{ height: "100%", padding: "16px 18px", overflowY: "auto" }} className="light-scrollbar">
                        {answer ? (
                          <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontWeight: 450 }}>
                            {answer}
                            {partial && (
                              <span style={{ color: T.accent, opacity: 0.5, animation: "pulse 1s infinite" }}> {partial}</span>
                            )}
                          </p>
                        ) : (
                          <div style={{ height: "100%", display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" }}>
                            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${T.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Mic size={16} style={{ color: T.textFaint }} />
                            </div>
                            <p style={{ fontSize: 12.5, color: T.textFaint }}>
                              {isRecording ? "Listening to your response..." : "Tap the button to start answering"}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      feedback && <FeedbackPanel feedback={feedback} questionIndex={index} total={totalQ} />
                    )
                  )}

                  {activeTab === "history" && (
                    <div style={{ height: "100%", overflowY: "auto", padding: "12px 14px",
                      display: "flex", flexDirection: "column", gap: 10 }} className="light-scrollbar">
                      {history.length === 0 ? (
                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <p style={{ fontSize: 12, color: T.textFaint }}>Conversation history will appear here</p>
                        </div>
                      ) : history.map((turn, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: turn.role === "candidate" ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "85%", padding: "10px 14px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.6,
                            border: `1px solid ${turn.role === "interviewer" ? T.border : T.accentBrd}`,
                            background: turn.role === "interviewer" ? T.card : T.accentBg,
                            color: T.text,
                          }}>
                            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
                              color: turn.role === "interviewer" ? T.textFaint : T.accent, marginBottom: 5 }}>
                              {turn.role === "interviewer" ? "AI Interviewer" : "You"}
                            </p>
                            {turn.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score tracker */}
                {scores.length > 0 && (
                  <ScoreBarTracker scores={scores} total={totalQ} avg={avgScore} />
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              SUMMARY PHASE
          ══════════════════════════════════════════════════════ */}
          {phase === "summary" && (
            <motion.div key="summary"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              style={{ maxWidth: 800, margin: "0 auto", paddingTop: 8 }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-0.02em", marginBottom: 6 }}>
                  Results
                </h2>
                <p style={{ fontSize: 13, color: T.textMid }}>
                  {scores.length} of {questions.length} questions answered · {activeModel.name}
                </p>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}
                className="summary-stats">
                {[
                  { icon: Star,         label: "Average Score", value: `${avgScore}/10`,  color: T.accent   },
                  { icon: CheckCircle2, label: "Completed",     value: `${scores.length}`, color: T.success  },
                  { icon: TrendingUp,   label: "Top Score",     value: `${Math.max(...(scores.length ? scores : [0]))}/10`, color: "#21924A" },
                  { icon: Clock,        label: "Duration",      value: formatTime(sessionTime), color: T.warn },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.panel,
                    padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ padding: "9px 10px", borderRadius: 10, background: color + "10",
                      border: `1px solid ${color}25`, flexShrink: 0 }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: T.textFaint, textTransform: "uppercase",
                        letterSpacing: "0.08em", fontWeight: 700, marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: T.text, lineHeight: 1 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Score ring + breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, marginBottom: 24 }}
                className="summary-detail">
                {/* Ring */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel,
                  padding: 32, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <div style={{ position: "relative" }}>
                    <ScoreRing score={parseFloat(avgScore) || 0} size={128} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1,
                        color: scoreHex(parseFloat(avgScore) || 0) }}>{avgScore}</span>
                      <span style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>/ 10</span>
                    </div>
                  </div>
                  <p style={{ marginTop: 16, fontSize: 13, fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: scoreHex(parseFloat(avgScore) || 0) }}>
                    {scoreLabel(parseFloat(avgScore) || 0)}
                  </p>
                  <p style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>Overall Performance</p>
                </div>

                {/* Breakdown */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel, padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <BarChart3 size={15} style={{ color: T.accent }} />
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Score by Question</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {scores.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, width: 20, flexShrink: 0 }}>Q{i + 1}</span>
                        {taggedQuestions[i] && (
                          <DifficultyBadge diff={taggedQuestions[i].difficulty} />
                        )}
                        <div style={{ flex: 1, height: 8, borderRadius: 6, background: T.card, overflow: "hidden" }}>
                          <motion.div initial={{ width: 0 }}
                            animate={{ width: `${s * 10}%` }}
                            transition={{ duration: 0.8, delay: i * 0.07, ease: "easeOut" }}
                            style={{ height: "100%", borderRadius: 6, background: scoreHex(s),
                              boxShadow: `0 0 8px ${scoreHex(s)}55` }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, width: 24,
                          textAlign: "right", color: scoreHex(s) }}>{s}</span>
                      </div>
                    ))}
                    {scores.length === 0 && (
                      <p style={{ fontSize: 12, color: T.textFaint, textAlign: "center", padding: "20px 0" }}>
                        No scores recorded
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete delivery and STAR report */}
              <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.panel,
                padding: "22px 24px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Award size={16} style={{ color: T.accent }}/>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Complete Interview Report</h3>
                    </div>
                    <p style={{ fontSize: 11, color: T.textFaint, marginTop: 5 }}>
                      Based on your recorded answers in this practice session.
                    </p>
                  </div>
                  <div style={{ borderRadius: 999, padding: "7px 11px", background: T.successBg,
                    border: `1px solid ${T.success}30`, color: T.success, fontSize: 10, fontWeight: 900,
                    textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {sessionReport.overallScore}% coaching quality
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}
                  className="summary-stats">
                  {[
                    { label: "STAR Structure", value: `${sessionReport.starScore}%`, sub: "Context to measurable result" },
                    { label: "Speaking Pace", value: sessionReport.paceWpm ? `${sessionReport.paceWpm} wpm` : "Not measured", sub: sessionReport.paceLabel },
                    { label: "Filler Phrases", value: String(sessionReport.fillerTotal), sub: sessionReport.fillers[0] ? `Most used: ${sessionReport.fillers[0].phrase}` : "Clean delivery" },
                  ].map(item => (
                    <div key={item.label} style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, padding: 14 }}>
                      <p style={{ fontSize: 9, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 800 }}>{item.label}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: T.text, marginTop: 5 }}>{item.value}</p>
                      <p style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="summary-detail">
                  <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, padding: 16 }}>
                    <p style={{ fontSize: 10, color: T.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>STAR breakdown</p>
                    {Object.entries(sessionReport.star).map(([label, value]) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textMid, fontWeight: 700, textTransform: "capitalize", marginBottom: 5 }}>
                          <span>{label}</span><span>{value}/25</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 5, background: T.border, overflow: "hidden" }}>
                          <div style={{ width: `${value * 4}%`, height: "100%", borderRadius: 5, background: T.success }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, padding: 16 }}>
                    <p style={{ fontSize: 10, color: T.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Your next practice plan</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {sessionReport.improvementPlan.map((item, itemIndex) => (
                        <div key={item} style={{ display: "flex", gap: 9, fontSize: 11, lineHeight: 1.55, color: T.textMid, fontWeight: 600 }}>
                          <span style={{ color: T.success, fontWeight: 900 }}>{itemIndex + 1}.</span><span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={() => { setPhase("setup"); setQuestions([]); setTaggedQuestions([]); setScores([]); setIndex(0); setSessionTime(0); setHistory([]); setResponseDurations([]); }}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 22px",
                    borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${T.border}`, background: T.panel, color: T.textMid,
                    transition: "all 0.15s" }}>
                  <RotateCcw size={14} /> New Session
                </button>
                <motion.button onClick={() => { window.location.href = "/"; }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 22px",
                    borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", border: "none",
                    background: "linear-gradient(135deg, #1C7A3E, #21924A)", color: "white",
                    boxShadow: "0 4px 16px rgba(31,138,62,0.28)" }}>
                  <LayoutDashboard size={14} /> Return to Dashboard
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        .light-scrollbar::-webkit-scrollbar { width: 4px; }
        .light-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .light-scrollbar::-webkit-scrollbar-thumb { background: #d4dae6; border-radius: 8px; }
        .light-scrollbar::-webkit-scrollbar-thumb:hover { background: #b8c2d4; }
        .cx-slider { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 4px; outline: none; cursor: pointer; }
        .cx-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #1C7A3E; border: 2px solid white; box-shadow: 0 0 0 3px rgba(31,138,62,0.18), 0 2px 8px rgba(31,138,62,0.28); cursor: pointer; }
        .cx-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; background: #1C7A3E; box-shadow: 0 0 0 3px rgba(31,138,62,0.18); cursor: pointer; }
        .cx-slider:focus::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgba(31,138,62,0.28), 0 2px 8px rgba(31,138,62,0.3); }
        @media (max-width: 900px) {
          .setup-grid     { grid-template-columns: 1fr !important; }
          .preflight-grid { grid-template-columns: 1fr !important; }
          .interview-grid { grid-template-columns: 1fr !important; height: auto !important; }
          .summary-stats  { grid-template-columns: 1fr 1fr !important; }
          .summary-detail { grid-template-columns: 1fr !important; }
        }
      `}} />
    </div>
  );
}
