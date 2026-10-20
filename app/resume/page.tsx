"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MASTER_RESUME } from "../../data/masterResume";
import mammoth from "mammoth";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  TEMPLATE_LIST, buildPrintHTML, getTemplateThumbnail,
  type TemplateId,
} from "./components/templates";
import {
  Sparkles, Download, RotateCcw, User, Palette, Save, FileText,
  Plus, Trash2, Award, Briefcase, GraduationCap, Code, Wrench,
  ChevronUp, ChevronDown, GripVertical, Layers, Link as LinkIcon,
  Loader2, Zap, Target, BarChart3,
  CheckCircle2, Wand2, Home, Upload, Eye, PenLine,
  BrainCircuit,
  PanelLeftClose, PanelLeftOpen, Keyboard, Coins, AlignLeft,
  AlertCircle, ChevronRight,
  Crown, X, TrendingUp,
} from "lucide-react";
import { useCredits } from "../lib/use-credits";
import { PLAN_CONFIG } from "../lib/credits";
import { answerCount, answersLabel } from "../../data/productFacts";
import { useToast } from "../../components/feedback/Toast";
import { classifyFailure } from "../../components/feedback/messages";

/* ── New isolated preview component ── */
import ResumePreview from "./preview";

let pdfJsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfJs) => {
      pdfJs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfJs;
    });
  }
  return pdfJsPromise;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8082";
const getEmail = () => auth.currentUser?.email || "";

/* ════════════════════════════════════════════════════════════════
   TYPES & CONFIG
════════════════════════════════════════════════════════════════ */
type SectionId =
  | "summary" | "skills" | "experience"
  | "projects" | "education" | "certifications";
type TabId = "edit" | "ai" | "style" | "ats";
type AiProvider = "openai" | "gemini" | "groq";

const DEFAULT_ORDER: SectionId[] = [
  "summary", "skills", "experience", "projects", "education", "certifications",
];

const SECTION_META: Record<SectionId, { label: string; Icon: any; color: string; bg: string }> = {
  summary:        { label: "Summary",        Icon: FileText,      color: "#1c7a3e", bg: "rgba(28,122,62,0.07)"  },
  skills:         { label: "Skills",         Icon: Wrench,        color: "#1c7a3e", bg: "rgba(28,122,62,0.07)"   },
  experience:     { label: "Experience",     Icon: Briefcase,     color: "#1c7a3e", bg: "rgba(28,122,62,0.07)"   },
  projects:       { label: "Projects",       Icon: Code,          color: "#1c7a3e", bg: "rgba(28,122,62,0.07)"  },
  education:      { label: "Education",      Icon: GraduationCap, color: "#1c7a3e", bg: "rgba(28,122,62,0.07)"   },
  certifications: { label: "Certifications", Icon: Award,         color: "#1c7a3e", bg: "rgba(28,122,62,0.07)"  },
};

const AI_PROVIDERS: {
  id: AiProvider; label: string; model: string;
  color: string; light: string; icon: string; desc: string;
}[] = [
  { id: "gemini", label: "Gemini", model: "2.0 Flash", color: "#4285f4", light: "rgba(66,133,244,0.10)", icon: "✧", desc: "Fast & smart" },
];

const FONTS = [
  // ── SERIF ──────────────────────────────────────────────────────
  { key: "times",        label: "Times New Roman",    family: '"Times New Roman", Times, serif',                            cat: "Serif" },
  { key: "georgia",      label: "Georgia",            family: 'Georgia, Cambria, "Times New Roman", serif',                 cat: "Serif" },
  { key: "palatino",     label: "Palatino",           family: '"Palatino Linotype", Palatino, Georgia, serif',              cat: "Serif" },
  { key: "garamond",     label: "EB Garamond",        family: '"EB Garamond", Georgia, serif',                              cat: "Serif", url: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&display=swap" },
  { key: "cormorant",    label: "Cormorant Garamond",  family: '"Cormorant Garamond", Georgia, serif',                      cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap" },
  { key: "merriweather", label: "Merriweather",       family: '"Merriweather", Georgia, serif',                             cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" },
  { key: "lora",         label: "Lora",               family: '"Lora", Georgia, serif',                                     cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap" },
  { key: "playfair",     label: "Playfair Display",   family: '"Playfair Display", Georgia, serif',                         cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap" },
  { key: "libre",        label: "Libre Baskerville",  family: '"Libre Baskerville", Georgia, serif',                        cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" },
  { key: "crimson",      label: "Crimson Text",       family: '"Crimson Text", Georgia, serif',                             cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&display=swap" },
  { key: "spectral",     label: "Spectral",           family: '"Spectral", Georgia, serif',                                 cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Spectral:wght@400;600;700&display=swap" },
  { key: "alegreya",     label: "Alegreya",           family: '"Alegreya", Georgia, serif',                                 cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&display=swap" },
  { key: "notoserif",    label: "Noto Serif",         family: '"Noto Serif", Georgia, serif',                               cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap" },
  { key: "bitter",       label: "Bitter",             family: '"Bitter", Georgia, serif',                                   cat: "Serif", url: "https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&display=swap" },
  { key: "ptserif",      label: "PT Serif",           family: '"PT Serif", Georgia, serif',                                 cat: "Serif", url: "https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&display=swap" },
  // ── SANS ───────────────────────────────────────────────────────
  { key: "system",       label: "System UI",          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',  cat: "Sans"  },
  { key: "arial",        label: "Arial",              family: 'Arial, Helvetica, sans-serif',                               cat: "Sans"  },
  { key: "calibri",      label: "Calibri",            family: '"Calibri", "Gill Sans", sans-serif',                         cat: "Sans"  },
  { key: "helvetica",    label: "Helvetica",          family: '"Helvetica Neue", Helvetica, Arial, sans-serif',             cat: "Sans"  },
  { key: "inter",        label: "Inter",              family: '"Inter", sans-serif',                                        cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" },
  { key: "roboto",       label: "Roboto",             family: '"Roboto", sans-serif',                                       cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" },
  { key: "opensans",     label: "Open Sans",          family: '"Open Sans", sans-serif',                                    cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" },
  { key: "lato",         label: "Lato",               family: '"Lato", sans-serif',                                         cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" },
  { key: "poppins",      label: "Poppins",            family: '"Poppins", sans-serif',                                      cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" },
  { key: "montserrat",   label: "Montserrat",         family: '"Montserrat", sans-serif',                                   cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap" },
  { key: "raleway",      label: "Raleway",            family: '"Raleway", sans-serif',                                      cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;900&display=swap" },
  { key: "nunito",       label: "Nunito",             family: '"Nunito", sans-serif',                                       cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&display=swap" },
  { key: "source",       label: "Source Sans 3",      family: '"Source Sans 3", sans-serif',                                cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" },
  { key: "dmSans",       label: "DM Sans",            family: '"DM Sans", sans-serif',                                      cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" },
  { key: "rubik",        label: "Rubik",              family: '"Rubik", sans-serif',                                        cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" },
  { key: "ubuntu",       label: "Ubuntu",             family: '"Ubuntu", sans-serif',                                       cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap" },
  { key: "barlow",       label: "Barlow",             family: '"Barlow", sans-serif',                                       cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" },
  { key: "outfit",       label: "Outfit",             family: '"Outfit", sans-serif',                                       cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" },
  { key: "figtree",      label: "Figtree",            family: '"Figtree", sans-serif',                                      cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" },
  { key: "mulish",       label: "Mulish",             family: '"Mulish", sans-serif',                                       cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;900&display=swap" },
  { key: "noto",         label: "Noto Sans",          family: '"Noto Sans", sans-serif',                                    cat: "Sans",  url: "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap" },
  // ── MONO ───────────────────────────────────────────────────────
  { key: "courier",      label: "Courier New",        family: '"Courier New", Courier, monospace',                          cat: "Mono"  },
  { key: "firacode",     label: "Fira Code",          family: '"Fira Code", monospace',                                     cat: "Mono",  url: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap" },
  { key: "jetbrains",    label: "JetBrains Mono",     family: '"JetBrains Mono", monospace',                                cat: "Mono",  url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" },
  { key: "spacemono",    label: "Space Mono",         family: '"Space Mono", monospace',                                    cat: "Mono",  url: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" },
  { key: "inconsolata",  label: "Inconsolata",        family: '"Inconsolata", monospace',                                   cat: "Mono",  url: "https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500;700&display=swap" },
  { key: "sourcecodemono", label: "Source Code Pro",  family: '"Source Code Pro", monospace',                               cat: "Mono",  url: "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;700&display=swap" },
];

// Accent colours a recruiter would take seriously, each one once (duplicates broke React keys).
const COLORS = [
  "#1C7A3E","#0f5132","#0d9488","#1e40af","#1e3a5f","#475569",
  "#1e293b","#000000","#7c2d12","#854d0e","#9f1239","#6b21a8",
];

const PAPER: Record<string, { w: number; h: number; label: string }> = {
  a4:     { w: 794, h: 1123, label: "A4"     },
  letter: { w: 816, h: 1056, label: "Letter" },
};

/* ════════════════════════════════════════════════════════════════
   THEME
════════════════════════════════════════════════════════════════ */
const T = {
  bg:           "#f4f2ee",
  bgPanel:      "#ffffff",
  bgHeader:     "#ffffff",
  border:       "#e7e3dc",
  borderStrong: "#d6d0c6",
  textPrimary:  "#1a1f1c",
  textSecondary:"#5e655f",
  textTertiary: "#959b95",
  accent:       "#1c7a3e",
  accentHover:  "#166232",
  accentLight:  "rgba(28,122,62,0.08)",
  success:      "#1c7a3e",
  successLight: "rgba(28,122,62,0.08)",
  warning:      "#b45309",
  warningLight: "rgba(180,83,9,0.08)",
  danger:       "#c2410c",
  dangerLight:  "rgba(194,65,12,0.08)",
  purple:       "#1c7a3e",
  purpleLight:  "rgba(28,122,62,0.08)",
  shadow:       "0 1px 2px rgba(26,31,28,0.05)",
  shadowMd:     "0 6px 20px rgba(26,31,28,0.08)",
  shadowLg:     "0 16px 40px rgba(26,31,28,0.12)",
  radius:       "10px",
  radiusMd:     "12px",
  radiusLg:     "16px",
};

/* ════════════════════════════════════════════════════════════════
   AI HELPER
════════════════════════════════════════════════════════════════ */
async function fetchAi(payload: any) {
  let authToken = "";
  try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
  const res = await fetch("/api/stt/tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ ...payload, userEmail: getEmail() }),
    signal: AbortSignal.timeout(35000),
  });
  const data = await res.json();
  if (res.status === 402 || data.error === "insufficient_credits") {
    window.location.href = "/pricing";
    throw new Error("insufficient_credits");
  }
  return data;
}

/* ════════════════════════════════════════════════════════════════
   ATS SCANNER
════════════════════════════════════════════════════════════════ */
// Resume strength: plain checks a recruiter makes in the first seconds. Each one says what to do and which section does it.
function resumeChecks(d: any): { ok: boolean; todo: string; section: string }[] {
  const p = d?.personalInfo || {};
  const jobs: any[] = Array.isArray(d?.experience) ? d.experience : [];
  const bullets: string[] = [...jobs, ...(Array.isArray(d?.projects) ? d.projects : [])]
    .flatMap((x: any) => Array.isArray(x?.bullets) ? x.bullets : []).filter((b: any) => typeof b === "string" && b.trim());
  const words = String(d?.summary || "").trim().split(/\s+/).filter(Boolean).length;
  const skills = (Array.isArray(d?.skillCategories) ? d.skillCategories : [])
    .flatMap((c: any) => String(c?.skills || "").split(",")).map((x: string) => x.trim()).filter(Boolean).length;
  const realJobs = jobs.filter(j => j?.company && !/^(company name|previous company)$/i.test(String(j.company).trim()));
  const edu: any[] = Array.isArray(d?.education) ? d.education : [];
  return [
    { ok: !!p.name && !/^your full name$/i.test(String(p.name).trim()), todo: "Add your name", section: "personal" },
    { ok: !!p.email && !/example\.com$/i.test(String(p.email).trim()) && !!p.phone && !/000.?0000/.test(p.phone), todo: "Add your email and phone", section: "personal" },
    { ok: !!p.linkedin && !/yourprofile|\/in\/you$/i.test(p.linkedin), todo: "Add your LinkedIn link", section: "personal" },
    { ok: words >= 30 && words <= 110, todo: words < 30 ? "Write a summary of 3 or 4 sentences" : "Shorten your summary to about 4 sentences", section: "summary" },
    { ok: realJobs.length > 0, todo: "Add your work experience", section: "experience" },
    { ok: jobs.length > 0 && jobs.every(j => (j?.bullets || []).filter((b: string) => b?.trim()).length >= 3), todo: "Give each job at least 3 bullet points", section: "experience" },
    { ok: bullets.length > 0 && bullets.filter(b => /\d/.test(b)).length * 2 >= bullets.length, todo: "Put a real number in more bullets (users, time, money)", section: "experience" },
    { ok: skills >= 8, todo: "List at least 8 skills", section: "skills" },
    { ok: edu.some(e => e?.school && !/^university name$/i.test(String(e.school).trim())), todo: "Add your education", section: "education" },
  ];
}

// Keyword check (rebuilt 2026-10-20). The old one searched the raw JSON for each word, so "ml" counted as found inside
// "html", field names like "skills" always matched, and "artificial intelligence" was two unrelated words.
// Now: only the resume's own text, whole words only, and common long and short forms count as the same keyword.
const ATS_SYNONYMS: [string, string[]][] = [
  ["AI", ["artificial intelligence", "ai"]],
  ["ML", ["machine learning", "ml"]],
  ["AI/ML", ["ai/ml", "ai ml"]],
  ["GenAI", ["generative ai", "genai", "gen ai"]],
  ["LLM", ["large language models", "large language model", "llms", "llm"]],
  ["NLP", ["natural language processing", "nlp"]],
  ["Deep learning", ["deep learning", "dl"]],
  ["Computer vision", ["computer vision"]],
  ["Data science", ["data science"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["JavaScript", ["javascript", "js"]],
  ["TypeScript", ["typescript", "ts"]],
  ["Node.js", ["node.js", "nodejs", "node"]],
  ["React", ["react.js", "reactjs", "react"]],
  ["CI/CD", ["ci/cd", "cicd", "continuous integration"]],
  ["AWS", ["amazon web services", "aws"]],
  ["GCP", ["google cloud platform", "google cloud", "gcp"]],
  ["Azure", ["microsoft azure", "azure"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["REST APIs", ["rest apis", "rest api", "restful", "rest"]],
  ["Microservices", ["microservices", "microservice"]],
];

function resumeText(d: any): string {
  const out: string[] = [];
  const walk = (v: any) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(d);
  return " " + out.join(" \n ").toLowerCase() + " ";
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const hasWord = (text: string, term: string) => new RegExp(`(^|[^a-z0-9+#])${escapeRe(term)}(?![a-z0-9+#])`).test(text);

function scanATS(resumeData: any, jdText: string) {
  if (!jdText.trim()) return { score: 0, found: [], missing: [], total: 0 };
  const resume = resumeText(resumeData);
  let jd = " " + jdText.toLowerCase() + " ";
  const concepts: { label: string; forms: string[] }[] = [];
  for (const [label, forms] of ATS_SYNONYMS) {
    if (forms.some(f => hasWord(jd, f))) {
      concepts.push({ label, forms });
      for (const f of forms) jd = jd.replace(new RegExp(`(^|[^a-z0-9+#])${escapeRe(f)}(?![a-z0-9+#])`, "g"), "$1 ");
    }
  }
  // "AI/ML" in a job post means both; check AI and ML on their own so either half can be found.
  const aiml = concepts.findIndex(c => c.label === "AI/ML");
  if (aiml >= 0) {
    concepts.splice(aiml, 1);
    for (const l of ["AI", "ML"]) if (!concepts.some(c => c.label === l)) concepts.push({ label: l, forms: ATS_SYNONYMS.find(x => x[0] === l)![1] });
  }
  const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","can","shall","this","that","these","those","i","you","we","they","he","she","it","my","your","our","their","his","her","its","me","us","them","who","which","what","where","when","how","why","not","no","all","each","every","both","few","more","most","other","some","such","than","too","very","just","about","above","after","again","also","as","because","before","between","during","into","through","under","until","up","over","out","if","so","then","here","there","only","own","same","while","any","new","now","way","well","work","years","year","experience","role","team","company","using","etc","per","via","including","across","within","strong","ability","looking","join","responsible","requirements","qualifications","preferred","required","minimum","plus","knowledge","understanding","familiarity","good","great","excellent","must","nice","have","job","position","candidate","candidates","skills","skill","we're","you'll","working","build","building",
    // job titles and levels are not keywords anyone can add as a skill
    "senior","junior","lead","principal","staff","mid","level","engineer","engineers","developer","developers","manager","intern","associate","specialist","architect","sr","jr","remote","hybrid","onsite","full","time","part","hiring"]);
  const words = jd.replace(/[^a-z0-9\s+#.]/g, " ").split(/\s+/).map(w => w.replace(/^\.+|\.+$/g, ""))
    .filter(w => w.length > 1 && !stopWords.has(w) && !/^\d+$/.test(w));
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const CASE: Record<string, string> = { tensorflow:"TensorFlow", pytorch:"PyTorch", "scikit-learn":"scikit-learn", sql:"SQL", nosql:"NoSQL", mongodb:"MongoDB",
    mysql:"MySQL", graphql:"GraphQL", fastapi:"FastAPI", github:"GitHub", gitlab:"GitLab", html:"HTML", css:"CSS", api:"API", apis:"APIs", ios:"iOS", devops:"DevOps", mlops:"MLOps", openai:"OpenAI", langchain:"LangChain" };
  const nice = (w: string) => CASE[w] ?? (w.length <= 3 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1));
  const singles = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w]) => ({ label: nice(w), forms: [w] }));
  const all = [...concepts, ...singles].slice(0, 40);
  const found   = all.filter(c => c.forms.some(f => hasWord(resume, f))).map(c => c.label);
  const missing = all.filter(c => !c.forms.some(f => hasWord(resume, f))).map(c => c.label);
  const score   = all.length > 0 ? Math.round((found.length / all.length) * 100) : 0;
  return { score, found, missing, total: all.length };
}

/* ════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
════════════════════════════════════════════════════════════════ */
const Inp = ({ value, onChange, placeholder = "", type = "text" }: any) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width:"100%", background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:T.radius,
      padding:"10px 12px", fontSize:14, color:T.textPrimary, outline:"none", transition:"all 0.15s", fontFamily:"inherit" }}
    onFocus={e => { e.target.style.borderColor=T.accent; e.target.style.boxShadow=`0 0 0 3px ${T.accentLight}`; }}
    onBlur={e  => { e.target.style.borderColor=T.border; e.target.style.boxShadow="none"; }}
  />
);

const Textarea = ({ value, onChange, placeholder = "", rows = 3 }: any) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ width:"100%", background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:T.radius,
      padding:"10px 12px", fontSize:14, color:T.textPrimary, outline:"none", transition:"all 0.15s",
      resize:"vertical", lineHeight:1.6, fontFamily:"inherit" }}
    onFocus={e => { (e.target as any).style.borderColor=T.accent; (e.target as any).style.boxShadow=`0 0 0 3px ${T.accentLight}`; }}
    onBlur={e  => { (e.target as any).style.borderColor=T.border;  (e.target as any).style.boxShadow="none"; }}
  />
);

const Label = ({ children }: any) => (
  <div style={{ fontSize:12.5, color:T.textSecondary, fontWeight:600, marginBottom:6 }}>{children}</div>
);

const SectionCard = ({ children }: any) => (
  <div style={{ background:T.bgPanel, border:`1px solid ${T.border}`, borderRadius:T.radiusMd,
    padding:16, marginBottom:12 }}>{children}</div>
);

const Divider = () => <div style={{ height:1, background:T.border, margin:"14px 0" }} />;

function Tooltip({ children, tip, side = "right" }: { children: React.ReactNode; tip: string; side?: "right"|"top"|"bottom" }) {
  const [show, setShow] = useState(false);
  const pos = side === "right" ? { left:"calc(100% + 10px)", top:"50%", transform:"translateY(-50%)" }
    : side === "top"    ? { bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)" }
    : { top:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)" };
  return (
    <div style={{ position:"relative", display:"inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }} transition={{ duration:0.1 }}
            style={{ position:"absolute", ...pos, zIndex:9999, pointerEvents:"none",
              background:T.textPrimary, color:"#fff", fontSize:11, fontWeight:600,
              padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap", boxShadow:T.shadowMd }}>
            {tip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompletionDot({ complete }: { complete: boolean }) {
  return (
    <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
      background: complete ? T.success : T.border,
      boxShadow: complete ? `0 0 0 2px ${T.successLight}` : "none", transition:"all 0.2s" }} />
  );
}

function WordCountBadge({ text }: { text: string }) {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  return <span style={{ fontSize:10, color:T.textTertiary, fontWeight:600 }}>{count} words</span>;
}

const ProBadge = () => (
  <span style={{ display:"inline-flex", alignItems:"center", fontSize:11, fontWeight:700,
    padding:"2px 8px", borderRadius:20, background:T.accentLight, color:T.accent }}>
    Pro
  </span>
);

/* ════════════════════════════════════════════════════════════════
   AI PROVIDER SELECTOR
════════════════════════════════════════════════════════════════ */
function AiProviderSelector({ value, onChange }: { value: AiProvider; onChange: (p: AiProvider) => void }) {
  const active = AI_PROVIDERS.find(p => p.id === value) ?? AI_PROVIDERS[0];
  return (
    <div style={{ marginBottom:16 }}>
      <Label>AI Provider</Label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8 }}>
        {AI_PROVIDERS.map(p => {
          const isActive = value === p.id;
          return (
            <button key={p.id} onClick={() => onChange(p.id)}
              style={{ padding:"10px 4px", borderRadius:T.radiusMd,
                border:`1px solid ${isActive ? p.color : T.border}`,
                background: isActive ? p.light : T.bg,
                cursor:"pointer", transition:"all 0.15s",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                boxShadow: isActive ? `0 2px 8px ${p.color}22` : "none" }}>
              <span style={{ fontSize:20, lineHeight:1 }}>{p.icon}</span>
              <span style={{ fontSize:11, fontWeight:800, color: isActive ? p.color : T.textSecondary }}>{p.label}</span>
              <span style={{ fontSize:9, color: isActive ? p.color + "bb" : T.textTertiary, fontWeight:600 }}>{p.model}</span>
              {isActive && <div style={{ width:5, height:5, borderRadius:"50%", background:p.color, marginTop:1 }} />}
            </button>
          );
        })}
      </div>
      <div style={{ padding:"8px 12px", borderRadius:T.radius,
        background: active.light, border:`1px solid ${active.color}30`,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:14 }}>{active.icon}</span>
        <div>
          <span style={{ fontSize:11, fontWeight:700, color: active.color }}>{active.label} {active.model}</span>
          <span style={{ fontSize:11, color:T.textSecondary }}>: {active.desc}</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CREDIT USAGE TOAST
════════════════════════════════════════════════════════════════ */
interface CreditToastProps {
  action: string; cost: number; remaining: number; max: number; isUnlimited: boolean; onDone: () => void;
}
function CreditUsageToast({ action, cost, remaining, max, isUnlimited, onDone }: CreditToastProps) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:10, scale:0.95 }} transition={{ duration:0.2 }}
      style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:T.bgPanel,
        border:`1px solid ${T.border}`, borderRadius:T.radiusMd, padding:"12px 16px",
        boxShadow:T.shadowLg, display:"flex", alignItems:"center", gap:12, minWidth:280 }}>
      <div style={{ width:36, height:36, borderRadius:T.radius, flexShrink:0,
        background:isUnlimited ? T.purpleLight : T.accentLight,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {isUnlimited ? <Crown size={16} style={{ color:T.purple }} /> : <Coins size={16} style={{ color:T.accent }} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.textPrimary, marginBottom:2 }}>
          {isUnlimited ? "Plan answers active" : `${answersLabel(cost)} used`}
        </div>
        <div style={{ fontSize:11, color:T.textSecondary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {action} {isUnlimited ? "✓" : `· ${answerCount(remaining)} left`}
        </div>
        {!isUnlimited && (
          <div style={{ marginTop:5, height:3, borderRadius:3, background:T.border, overflow:"hidden" }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,(remaining/max)*100)}%` }} transition={{ duration:0.6 }}
              style={{ height:"100%", borderRadius:3, background:remaining<max*0.1?T.danger:remaining<max*0.25?T.warning:T.success }} />
          </div>
        )}
      </div>
      <button onClick={onDone} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:2, flexShrink:0 }}>
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CREDIT METER
════════════════════════════════════════════════════════════════ */
function CreditMeter({ credits=0, max=PLAN_CONFIG.free.totalCredits, isUnlimited=false, plan="free", onOpenHistory }: {
  credits?: number; max?: number; isUnlimited?: boolean; plan?: string; onOpenHistory?: () => void;
}) {
  const pct   = isUnlimited ? 100 : Math.min(100, Math.round((credits/max)*100));
  const color = isUnlimited ? T.purple : pct>50 ? T.success : pct>20 ? T.warning : T.danger;
  const label = isUnlimited ? "Monthly plan answers" : `${answerCount(credits)} / ${answerCount(max)} answers left`;
  return (
    <Tooltip tip="See what used your answers" side="bottom">
      <button onClick={onOpenHistory}
        style={{ display:"flex", alignItems:"center", gap:7, padding:"0 12px", height:38, borderRadius:T.radius,
          background:"transparent", border:"none", cursor:"pointer", transition:"background 0.15s", color:T.textSecondary }}
        onMouseEnter={e=>(e.currentTarget as any).style.background=T.bg}
        onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>
        <Coins size={15} style={{ color: isUnlimited ? T.accent : color }} />
        <span style={{ fontSize:13.5, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>
          {isUnlimited ? "Unlimited answers" : <><b style={{ color:T.textPrimary }}>{answerCount(credits)}</b> answers left</>}
        </span>
      </button>
    </Tooltip>
  );
}

/* ════════════════════════════════════════════════════════════════
   CREDIT HISTORY DRAWER
════════════════════════════════════════════════════════════════ */
interface CreditHistoryEntry { action: string; cost: number; timestamp: Date; label: string; }

function CreditHistoryDrawer({ history, credits, max, isUnlimited, plan, onClose, onUpgrade }: {
  history: CreditHistoryEntry[]; credits: number; max: number; isUnlimited: boolean; plan: string;
  onClose: () => void; onUpgrade: () => void;
}) {
  const pct      = isUnlimited ? 100 : Math.min(100, Math.round((credits/max)*100));
  const barColor = isUnlimited ? T.purple : pct>50 ? T.success : pct>20 ? T.warning : T.danger;
  const totalUsed = history.reduce((s,h) => s+h.cost, 0);
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", zIndex:8000,
        display:"flex", alignItems:"flex-start", justifyContent:"flex-end", backdropFilter:"blur(2px)" }}
      onClick={onClose}>
      <motion.div initial={{ x:340 }} animate={{ x:0 }} exit={{ x:340 }}
        transition={{ type:"spring", stiffness:300, damping:30 }}
        onClick={e=>e.stopPropagation()}
        style={{ width:340, height:"100vh", background:T.bgPanel, borderLeft:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", boxShadow:"-8px 0 32px rgba(0,0,0,0.1)" }}>
        <div style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:T.radius, background:T.accentLight,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <TrendingUp size={16} style={{ color:T.accent }} />
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>Answers used</div>
                <div style={{ fontSize:10, color:T.textTertiary }}>This session</div>
              </div>
            </div>
            <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:4 }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:T.radiusMd,
            background:isUnlimited?T.purpleLight:T.bg, border:`1px solid ${isUnlimited?T.purple+"30":T.border}` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:T.textTertiary, fontWeight:600, marginBottom:2 }}>Current Balance</div>
                <div style={{ fontSize:28, fontWeight:900, color:barColor, lineHeight:1 }}>
                  {isUnlimited ? "∞" : answerCount(credits)}
                  {!isUnlimited && <span style={{ fontSize:13, fontWeight:600, color:T.textTertiary }}> / {answerCount(max)}</span>}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, fontWeight:800, color:T.textTertiary, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{plan} plan</div>
                {!isUnlimited && <div style={{ fontSize:11, color:T.textSecondary, fontWeight:600 }}>{totalUsed} used this session</div>}
              </div>
            </div>
            {!isUnlimited && (
              <div style={{ height:6, borderRadius:4, background:T.border, overflow:"hidden" }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8 }}
                  style={{ height:"100%", borderRadius:4, background:barColor }} />
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.textTertiary, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>What uses an answer</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {[
              { label:"AI Tailor Resume",    cost:20, icon:"✦", color:T.accent  },
              { label:"AI Rewrite Bullet",   cost:5,  icon:"✧", color:T.purple  },
              { label:"AI Generate Summary", cost:5,  icon:"✧", color:T.purple  },
              { label:"Resume Analysis",     cost:5,  icon:"◈", color:T.warning },
              { label:"ATS Scan",            cost:0,  icon:"◎", color:T.success },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"7px 10px", borderRadius:T.radius, background:T.bg }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14, color:item.color }}>{item.icon}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:T.textSecondary }}>{item.label}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:800, color:item.cost===0?T.success:T.textPrimary }}>
                  {item.cost===0 ? "Free" : answersLabel(item.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.textTertiary, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Session Activity</div>
          {history.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <Coins size={28} style={{ color:T.textTertiary, marginBottom:8 }} />
              <div style={{ fontSize:12, color:T.textTertiary }}>No AI actions yet this session</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[...history].reverse().map((h,i) => (
                <motion.div key={i} initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                    borderRadius:T.radiusMd, background:T.bg, border:`1px solid ${T.border}` }}>
                  <div style={{ width:30, height:30, borderRadius:T.radius, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:h.cost===0?T.successLight:T.accentLight }}>
                    <Coins size={13} style={{ color:h.cost===0?T.success:T.accent }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.label}</div>
                    <div style={{ fontSize:10, color:T.textTertiary }}>{h.timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:800, flexShrink:0, color:h.cost===0?T.success:T.danger }}>
                    {h.cost===0 ? "Free" : `-${h.cost}`}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        {!isUnlimited && (
          <div style={{ padding:"14px 20px", borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
            <button onClick={onUpgrade}
              style={{ width:"100%", padding:"11px 0", borderRadius:T.radiusMd, border:"none",
                background:T.accent,
                color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow:"0 4px 14px rgba(45,91,227,0.3)" }}>
              <Crown size={15} /> Upgrade for more answers
            </button>
            <p style={{ fontSize:10, color:T.textTertiary, textAlign:"center", marginTop:8 }}>Pro includes {answerCount(PLAN_CONFIG.pro.totalCredits).toLocaleString("en-US")} answers refreshed monthly</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAYWALL MODAL
════════════════════════════════════════════════════════════════ */
function PaywallModal({ action, cost, remaining, onClose }: {
  action: string; cost: number; remaining: number; onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9500,
        display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale:0.85, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.85, y:20 }}
        onClick={e=>e.stopPropagation()}
        style={{ background:T.bgPanel, borderRadius:T.radiusLg, padding:32, width:380,
          border:`1px solid ${T.border}`, boxShadow:T.shadowLg, textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:T.dangerLight,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Coins size={24} style={{ color:T.danger }} />
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:T.textPrimary, marginBottom:8 }}>Not enough answers left</div>
        <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.6, marginBottom:6 }}>
          <strong>{action}</strong> uses <strong>{answersLabel(cost)}</strong>.
        </p>
        <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.6, marginBottom:24 }}>
          You have <strong style={{ color:T.danger }}>{answersLabel(remaining)}</strong> left.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"10px 0", borderRadius:T.radiusMd, border:`1px solid ${T.border}`,
              background:T.bg, color:T.textSecondary, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={() => window.location.href="/pricing"}
            style={{ flex:2, padding:"10px 0", borderRadius:T.radiusMd, border:"none",
              background:T.accent,
              color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer",
              boxShadow:"0 4px 14px rgba(45,91,227,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Crown size={15} /> Upgrade to Pro
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SHORTCUTS MODAL
════════════════════════════════════════════════════════════════ */
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys:"⌘+S", desc:"Save resume" }, { keys:"⌘+P", desc:"Export PDF" },
    { keys:"⌘+Z", desc:"Undo last AI change" }, { keys:"⌘+1", desc:"Edit tab" },
    { keys:"⌘+2", desc:"AI tab" }, { keys:"⌘+3", desc:"Style tab" },
    { keys:"⌘+4", desc:"ATS Scanner" }, { keys:"⌘+B", desc:"Toggle sidebar" },
  ];
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:9000,
        display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.9, y:20 }}
        onClick={e=>e.stopPropagation()}
        style={{ background:T.bgPanel, borderRadius:T.radiusLg, padding:28, width:380,
          border:`1px solid ${T.border}`, boxShadow:T.shadowLg }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:T.radius, background:T.accentLight,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Keyboard size={15} style={{ color:T.accent }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary }}>Keyboard Shortcuts</div>
              <div style={{ fontSize:11, color:T.textTertiary }}>Work faster with hotkeys</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, fontSize:20, lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {shortcuts.map(s => (
            <div key={s.keys} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"8px 10px", borderRadius:T.radius, background:T.bg }}>
              <span style={{ fontSize:12, color:T.textSecondary }}>{s.desc}</span>
              <kbd style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5, background:T.textPrimary, color:"#fff" }}>{s.keys}</kbd>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function ResumePage() {
  const { notifyFailure, notify } = useToast();
  const [activeTab,      setActiveTab]      = useState<TabId>("edit");
  const [editSection,    setEditSection]    = useState<string>("personal");
  const [resumeData,     setResumeData]     = useState<any>(MASTER_RESUME);
  const [prevResume,     setPrevResume]     = useState<any>(null);
  const [sectionOrder,   setSectionOrder]   = useState<SectionId[]>(DEFAULT_ORDER);
  // Phones: the editor and the preview take turns on the full width. The desktop layout squeezed into 390px and the
  // page collapsed to its header (found 2026-10-20).
  const [narrow, setNarrow] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [customSections, setCustomSections] = useState<{id:string;title:string;items:{title:string;subtitle:string;date:string;description:string}[]}[]>([]);

  // Scroll sidebar to the content area whenever the active section changes
  const scrollToContent = (sectionId: string) => {
    setEditSection(sectionId);
    setTimeout(() => {
      const el = document.getElementById("section-content-area");
      const sidebar = document.getElementById("editor-sidebar");
      if (el && sidebar) {
        const offset = el.getBoundingClientRect().top - sidebar.getBoundingClientRect().top + sidebar.scrollTop - 8;
        sidebar.scrollTo({ top: offset, behavior: "smooth" });
      }
    }, 40);
  };
  const [jd,           setJd]           = useState("");
  const [aiProvider,   setAiProvider]   = useState<AiProvider>("gemini");

  const [accentColor,  setAccentColor]  = useState("#1C7A3E");
  const [fontSize,     setFontSize]     = useState(11);
  const [fontKey,      setFontKey]      = useState("georgia");
  const [lineHeight,   setLineHeight]   = useState(1.5);
  const [sectionGap,   setSectionGap]   = useState(16);
  const [marginPreset, setMarginPreset] = useState<"normal"|"narrow"|"wide">("normal");
  const [paperSize,    setPaperSize]    = useState<"a4"|"letter">("a4");
  const [fontFilter,   setFontFilter]   = useState<"all"|"Serif"|"Sans"|"Mono">("all");
  const [templateId,   setTemplateId]   = useState<TemplateId>("cornerstone");

  const [loading,           setLoading]           = useState(false);
  const [aiAction,          setAiAction]          = useState("");
  const [showDiff,          setShowDiff]          = useState(false);
  const [atsResult,         setAtsResult]         = useState<any>(null);
  const [rewritingBullet,   setRewritingBullet]   = useState<string|null>(null);
  const [saveStatus,        setSaveStatus]        = useState<"idle"|"saving"|"saved"|"error">("idle");
  // What the header says about saving: changes waiting, saving, saved to the account, or kept on this computer only.
  const [sync, setSync] = useState<"none"|"pending"|"saving"|"saved"|"local">("none");
  const [isPrinting,        setIsPrinting]        = useState(false);
  const [isExportingWord,   setIsExportingWord]   = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [showShortcuts,     setShowShortcuts]     = useState(false);

  const { credits, plan, isUnlimited, canAfford, checkAndDeduct, showPaywall, setShowPaywall, paywallAction, paywallCost } = useCredits();

  const [creditHistory,    setCreditHistory]    = useState<CreditHistoryEntry[]>([]);
  const [showCreditDrawer, setShowCreditDrawer] = useState(false);
  const [creditToast,      setCreditToast]      = useState<{ action:string; cost:number; remaining:number; max:number; isUnlimited:boolean; }|null>(null);

  const planMax = PLAN_CONFIG[plan]?.totalCredits ?? PLAN_CONFIG.free.totalCredits;

  // Reports a charge the server has already made. It must not do the subtraction
  // itself: `credits` comes from a live Firestore listener, so by the time this
  // runs the balance may already reflect the charge, and subtracting again showed
  // a number lower than the user actually had. Whether that happened depended on
  // which landed first, so the figure was sometimes right and sometimes not.
  // The live value is the single source of truth for the balance; this only
  // reports what the action cost.
  const recordCreditUsage = useCallback((label: string, action: string, cost: number) => {
    setCreditHistory(prev => [...prev, { action, label, cost, timestamp: new Date() }]);
    setCreditToast({ action: label, cost, remaining: isUnlimited ? planMax : Math.max(0, credits), max: planMax, isUnlimited });
  }, [credits, isUnlimited, planMax]);

  /* ── Draggable split pane ── */
  const DEFAULT_SIDEBAR_WIDTH = 380;
  const MIN_SIDEBAR_WIDTH = 340;
  const MAX_SIDEBAR_WIDTH = 600;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    // localStorage can throw when storage is disabled/blocked (some privacy
    // modes), and a corrupted value can parse to NaN — guard both so the page
    // never crashes on load and never gets a NaN width.
    try {
      if (typeof window !== "undefined") {
        const n = parseInt(localStorage.getItem("resume-sidebar-width") || "", 10);
        if (!Number.isNaN(n)) return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, n));
      }
    } catch { /* storage unavailable — fall through to default */ }
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const isDragging     = useRef(false);
  const dragStartX     = useRef(0);
  const dragStartWidth = useRef(0);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - dragStartX.current;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, dragStartWidth.current + delta));
      setSidebarWidth(newWidth);
      try { localStorage.setItem("resume-sidebar-width", String(newWidth)); } catch {}
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  const handleDividerDoubleClick = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try { localStorage.setItem("resume-sidebar-width", String(DEFAULT_SIDEBAR_WIDTH)); } catch {}
  };

  const fontObj = FONTS.find(f => f.key === fontKey) || FONTS[0];
  const ff      = fontObj.family;
  const ac      = accentColor;
  const fs      = fontSize;
  const paper   = PAPER[paperSize];
  const margins: Record<string, string> = { normal:"48px 52px", narrow:"32px 36px", wide:"56px 64px" };
  const pagePad = margins[marginPreset];

  useEffect(() => {
    if (fontObj.url) {
      const id = `gfont-${fontObj.key}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id=id; link.rel="stylesheet"; link.href=fontObj.url;
        document.head.appendChild(link);
      }
    }
  }, [fontObj]);

  useEffect(() => {
    const href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement("link"); l.rel="stylesheet"; l.href=href;
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key==="s") { e.preventDefault(); handleSave(); }
        if (e.key==="p") { e.preventDefault(); handleExportPDF(); }
        if (e.key==="z" && prevResume) { e.preventDefault(); setResumeData(prevResume); setShowDiff(false); }
        if (e.key==="1") { e.preventDefault(); setActiveTab("edit"); }
        if (e.key==="2") { e.preventDefault(); setActiveTab("ai"); }
        if (e.key==="3") { e.preventDefault(); setActiveTab("style"); }
        if (e.key==="4") { e.preventDefault(); setActiveTab("ats"); }
        if (e.key==="b") { e.preventDefault(); setSidebarCollapsed(c => !c); }
        if (e.key==="/") { e.preventDefault(); setShowShortcuts(true); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevResume]);

  const sectionComplete = useCallback((id: SectionId|"personal"): boolean => {
    if (id==="personal") { const p=resumeData.personalInfo||{}; return !!(p.name&&p.email&&p.phone); }
    if (id==="summary")        return !!(resumeData.summary?.trim());
    if (id==="skills")         return (resumeData.skillCategories||[]).length>0;
    if (id==="experience")     return (resumeData.experience||[]).length>0;
    if (id==="projects")       return (resumeData.projects||[]).length>0;
    if (id==="education")      return (resumeData.education||[]).length>0;
    if (id==="certifications") return (resumeData.certifications||[]).length>0;
    return false;
  }, [resumeData]);

  const completedSections = ["personal", ...DEFAULT_ORDER].filter(s => sectionComplete(s as any)).length;
  const totalSections = DEFAULT_ORDER.length + 1;

  /* ── Data helpers ── */
  const set = (fn: (d: any) => any) => setResumeData((p: any) => fn({ ...p }));
  const updateInfo = (field: string, value: string) => set(d => ({ ...d, personalInfo: { ...d.personalInfo, [field]: value } }));
  const addExperience    = () => set(d => ({ ...d, experience: [...(d.experience||[]), { company:"", role:"", location:"", period:"", bullets:[""] }] }));
  const removeExperience = (i: number) => set(d => ({ ...d, experience: d.experience.filter((_:any,x:number)=>x!==i) }));
  const updateExperience = (i: number, f: string, v: any) => set(d => { const a=[...d.experience]; a[i]={...a[i],[f]:v}; return {...d,experience:a}; });
  const addBullet    = (s: string, i: number) => set(d => { const a=[...d[s]]; a[i]={...a[i],bullets:[...(a[i].bullets||[]),""]}; return {...d,[s]:a}; });
  const updateBullet = (s: string, i: number, bi: number, v: string) => set(d => { const a=[...d[s]]; const b=[...a[i].bullets]; b[bi]=v; a[i]={...a[i],bullets:b}; return {...d,[s]:a}; });
  const removeBullet = (s: string, i: number, bi: number) => set(d => { const a=[...d[s]]; a[i]={...a[i],bullets:a[i].bullets.filter((_:any,x:number)=>x!==bi)}; return {...d,[s]:a}; });
  const addProject    = () => set(d => ({ ...d, projects: [...(d.projects||[]), { title:"", tech:"", period:"", bullets:[""] }] }));
  const removeProject = (i: number) => set(d => ({ ...d, projects: d.projects.filter((_:any,x:number)=>x!==i) }));
  const updateProject = (i: number, f: string, v: any) => set(d => { const a=[...d.projects]; a[i]={...a[i],[f]:v}; return {...d,projects:a}; });
  const addEducation    = () => set(d => ({ ...d, education: [...(d.education||[]), { school:"", degree:"", period:"", gpa:"" }] }));
  const removeEducation = (i: number) => set(d => ({ ...d, education: d.education.filter((_:any,x:number)=>x!==i) }));
  const updateEducation = (i: number, f: string, v: string) => set(d => { const a=[...d.education]; a[i]={...a[i],[f]:v}; return {...d,education:a}; });
  const addSkillCategory    = () => set(d => ({ ...d, skillCategories: [...(d.skillCategories||[]), { name:"", skills:"" }] }));
  const removeSkillCategory = (i: number) => set(d => ({ ...d, skillCategories: d.skillCategories.filter((_:any,x:number)=>x!==i) }));
  const updateSkillCategory = (i: number, f: string, v: string) => set(d => { const a=[...d.skillCategories]; a[i]={...a[i],[f]:v}; return {...d,skillCategories:a}; });
  const addCertification    = () => set(d => ({ ...d, certifications: [...(d.certifications||[]), ""] }));
  const removeCertification = (i: number) => set(d => ({ ...d, certifications: d.certifications.filter((_:any,x:number)=>x!==i) }));
  const updateCertification = (i: number, v: string) => set(d => { const a=[...d.certifications]; a[i]=v; return {...d,certifications:a}; });
  const addCustomLink    = () => set(d => ({ ...d, personalInfo: { ...d.personalInfo, customLinks:[...(d.personalInfo?.customLinks||[]),{ label:"", url:"" }] } }));
  const removeCustomLink = (i: number) => set(d => ({ ...d, personalInfo: { ...d.personalInfo, customLinks:d.personalInfo.customLinks.filter((_:any,x:number)=>x!==i) } }));
  const updateCustomLink = (i: number, f: string, v: string) => set(d => { const a=[...(d.personalInfo?.customLinks||[])]; a[i]={...a[i],[f]:v}; return {...d,personalInfo:{...d.personalInfo,customLinks:a}}; });
  const moveSection = (idx: number, dir: -1|1) => {
    const n = idx + dir;
    if (n < 0 || n >= sectionOrder.length) return;
    setSectionOrder(p => { const a=[...p]; [a[idx],a[n]]=[a[n],a[idx]]; return a; });
  };

  // ── Custom section helpers ──
  const addCustomSection = () => {
    const id = "custom_" + Date.now();
    setCustomSections(prev => [...prev, { id, title: "New Section", items: [] }]);
    setTimeout(() => scrollToContent(id), 60);
  };
  const removeCustomSection = (id: string) => {
    setCustomSections(prev => prev.filter(s => s.id !== id));
    setEditSection("personal");
  };
  const updateCustomSectionTitle = (id: string, title: string) =>
    setCustomSections(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  const addCustomSectionItem = (id: string) =>
    setCustomSections(prev => prev.map(s => s.id === id
      ? { ...s, items: [...s.items, { title:"", subtitle:"", date:"", description:"" }] }
      : s));
  const removeCustomSectionItem = (id: string, idx: number) =>
    setCustomSections(prev => prev.map(s => s.id === id
      ? { ...s, items: s.items.filter((_:any, i:number) => i !== idx) }
      : s));
  const updateCustomSectionItem = (id: string, idx: number, field: string, value: string) =>
    setCustomSections(prev => prev.map(s => {
      if (s.id !== id) return s;
      const items = [...s.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...s, items };
    }));

  /* ── File import ── */
  // Upload an existing resume: the file is read here, then organised into the sections word for word on the server.
  // There was no upload control on the page at all, and the old reader dumped everything into Summary (2026-10-20).
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readResumeFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "txt") return await file.text();
    if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value ?? "";
    }
    if (ext === "pdf") {
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), useSystemFonts: true, disableFontFace: true }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      return text;
    }
    return "";
  };
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setImporting(true);
    try {
      const text = (await readResumeFile(file)).trim();
      if (text.length < 40) { notifyFailure("upload"); return; }
      const token = (await auth.currentUser?.getIdToken().catch(() => "")) ?? "";
      if (!token) { notifyFailure("sessionExpired"); return; }
      const r = await fetch(`${API_BASE}/api/v1/resume/import`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.slice(0, 30000) }),
      });
      if (!r.ok) throw Object.assign(new Error("import_failed"), { status: r.status });
      const parsed = await r.json();
      setPrevResume(JSON.parse(JSON.stringify(resumeData)));
      setResumeData({
        ...MASTER_RESUME, ...parsed,
        personalInfo: { ...MASTER_RESUME.personalInfo, ...(parsed.personalInfo || {}), customLinks: parsed.personalInfo?.customLinks || [] },
        skillCategories: Array.isArray(parsed.skillCategories) ? parsed.skillCategories : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications.filter(Boolean) : [],
      });
      notify({ tone: "success", title: "Your resume is in", body: "Check each section on the left. Ctrl+Z puts back what was here before." });
    } catch (err: any) {
      notifyFailure(err?.status ? classifyFailure(err.status) : "upload");
    } finally {
      setImporting(false);
    }
  };

  /* ── AI TAILOR ── */
  const handleTailor = async () => {
    if (!jd || !jd.trim()) {
      notify({ tone: "info", title: "Add a job description", body: "Paste the job description or a few keywords, then run the tailor again." });
      return;
    }
    if (!canAfford("resume_tailor")) return;

    let authToken = "";
    try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
    if (!authToken) {
      notifyFailure("sessionExpired");
      return;
    }

    setLoading(true); setAiAction("tailoring");
    setPrevResume(JSON.parse(JSON.stringify(resumeData)));
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(`${API_BASE}/api/v1/resume/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ jd, masterResume: resumeData, provider: aiProvider }),
        signal: controller.signal,
      });
      if (!response.ok) {
        // Carry the status, not the body. The message is chosen from house copy
        // below so no backend string or provider name reaches the screen.
        const failure = new Error("tailor_failed") as Error & { status?: number };
        failure.status = response.status;
        throw failure;
      }
      setResumeData(await response.json());
      setShowDiff(true);   // stays on Tailor, where the result and Undo are; it used to jump away and hide both
      recordCreditUsage("AI Tailor Resume", "resume_tailor", 20);
    } catch (e: any) {
      console.error("[Replysis] Resume tailoring failed:", e?.status ?? e?.name ?? "Error");
      if (e?.name === "AbortError") notifyFailure("timeout", handleTailor);
      else notifyFailure(classifyFailure(e?.status), handleTailor);
    } finally {
      if (timeout) clearTimeout(timeout);
      setLoading(false); setAiAction("");
    }
  };

  /* ── AI REWRITE BULLET ── */
  const handleRewriteBullet = async (section: string, itemIdx: number, bulletIdx: number) => {
    const ok = await checkAndDeduct("mock_script"); if (!ok) return;
    const key = `${section}-${itemIdx}-${bulletIdx}`;
    setRewritingBullet(key);
    try {
      const data = await fetchAi({ mode:"rewrite_bullet", bullet:resumeData[section][itemIdx].bullets[bulletIdx], resume:JSON.stringify(resumeData), jd:jd||"N/A", provider:aiProvider });
      if (data?.rewritten||data?.bullet) { updateBullet(section,itemIdx,bulletIdx,data.rewritten||data.bullet); recordCreditUsage("AI Rewrite Bullet","mock_script",5); }
    } catch { /* silent */ }
    setRewritingBullet(null);
  };

  /* ── AI GENERATE SUMMARY ── */
  const handleGenerateSummary = async () => {
    const ok = await checkAndDeduct("mock_script"); if (!ok) return;
    setLoading(true); setAiAction("summary");
    try {
      const data = await fetchAi({ mode:"generate_summary", resume:JSON.stringify(resumeData), jd:jd||"N/A", provider:aiProvider });
      if (data?.summary) { set(d=>({...d,summary:data.summary})); recordCreditUsage("AI Generate Summary","mock_script",5); }
    } catch (err) {
      console.error("[Replysis] Summary generation failed:", (err as Error)?.name ?? "Error");
      notifyFailure("ai");
    }
    finally { setLoading(false); setAiAction(""); }
  };

  const runATS = () => { setAtsResult(scanATS(resumeData, jd)); };
  // A missing keyword the person really has goes into their skills, and the score updates at once.
  const addSkillFromAts = (k: string) => {
    const next = JSON.parse(JSON.stringify(resumeData));
    const cats: any[] = Array.isArray(next.skillCategories) ? next.skillCategories : (next.skillCategories = []);
    let cat = cats.find(c => /^(other|additional) skills$/i.test(String(c?.name || "").trim()));
    if (!cat) { cat = { name: "Other skills", skills: "" }; cats.push(cat); }
    const list = String(cat.skills || "").split(",").map((x: string) => x.trim()).filter(Boolean);
    if (!list.some(x => x.toLowerCase() === k.toLowerCase())) list.push(k);
    cat.skills = list.join(", ");
    setResumeData(next);
    setAtsResult(scanATS(next, jd));
    notify({ tone: "success", title: `${k} added to your skills`, body: "It is under Other skills. Move it or remove it in the Skills section." });
  };
  useEffect(() => { if (activeTab==="ats" && jd) runATS(); }, [activeTab]);

  /* ── Keeping the resume ──
     The page used to open on the template every time: Save sent only a few fields (experience, projects and education
     were never stored) and nothing was ever loaded back (found 2026-10-20). Now the whole builder is one snapshot:
     kept on this computer as you type, saved to the account a few seconds after you stop, and opened again next time,
     whichever copy is newer. */
  const snapshot = () => ({
    v: 1, resumeData, sectionOrder, customSections, accentColor, fontSize, fontKey, lineHeight, sectionGap,
    marginPreset, paperSize, templateId,
  });
  const applySnapshot = (d: any) => {
    if (!d || typeof d !== "object" || !d.resumeData) return false;
    setResumeData(d.resumeData);
    if (Array.isArray(d.sectionOrder)) setSectionOrder(d.sectionOrder);
    if (Array.isArray(d.customSections)) setCustomSections(d.customSections);
    if (typeof d.accentColor === "string") setAccentColor(d.accentColor);
    if (typeof d.fontSize === "number") setFontSize(d.fontSize);
    if (typeof d.fontKey === "string") setFontKey(d.fontKey);
    if (typeof d.lineHeight === "number") setLineHeight(d.lineHeight);
    if (typeof d.sectionGap === "number") setSectionGap(d.sectionGap);
    if (d.marginPreset) setMarginPreset(d.marginPreset);
    if (d.paperSize) setPaperSize(d.paperSize);
    if (d.templateId) setTemplateId(d.templateId);
    return true;
  };
  const restoredRef = useRef(false);          // nothing is saved until the person's own copy has been opened
  const uidRef = useRef<string | null>(null);
  const draftKey = (uid: string) => `replysis-resume-draft-${uid}`;

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (!u || uidRef.current === u.uid) return;
    uidRef.current = u.uid;
    let local: { savedAt: number; snap: any } | null = null;
    try { local = JSON.parse(localStorage.getItem(draftKey(u.uid)) || "null"); } catch { /* private window */ }
    let server: { savedAt: number; snap: any } | null = null;
    try {
      const token = await u.getIdToken();
      const r = await fetch(`${API_BASE}/api/v1/resume/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 200) {
        const body = await r.json();
        server = { savedAt: Date.parse(body.updatedAt) || 0, snap: JSON.parse(body.data) };
      }
    } catch { /* the copy on this computer still opens */ }
    const pick = local && (!server || local.savedAt > server.savedAt) ? local : server;
    if (pick) applySnapshot(pick.snap);
    restoredRef.current = true;
  }), []);

  const saveToAccount = async (silent: boolean) => {
    const token = await auth.currentUser?.getIdToken().catch(() => "") ?? "";
    if (!token) { setSync("local"); return false; }
    setSync("saving");
    const r = await fetch(`${API_BASE}/api/v1/resume/save`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fullName: resumeData.personalInfo?.name, headline: resumeData.personalInfo?.headline,
        email: resumeData.personalInfo?.email, phone: resumeData.personalInfo?.phone, summary: resumeData.summary,
        skillCategories: JSON.stringify(resumeData.skillCategories || []), accentColor, fontSize,
        data: JSON.stringify(snapshot()) }),
    });
    if (!silent) setSaveStatus(r.ok ? "saved" : "error");
    setSync(r.ok ? "saved" : "local");
    return r.ok;
  };

  // As you type: a copy on this computer at once, and the account a few seconds after you stop.
  useEffect(() => {
    if (!restoredRef.current || !uidRef.current) return;
    const uid = uidRef.current;
    const local = setTimeout(() => {
      try { localStorage.setItem(draftKey(uid), JSON.stringify({ savedAt: Date.now(), snap: snapshot() })); } catch { /* full or private */ }
    }, 500);
    setSync("pending");
    const remote = setTimeout(() => { void saveToAccount(true).catch(() => setSync("local")); }, 4000);
    return () => { clearTimeout(local); clearTimeout(remote); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData, sectionOrder, customSections, accentColor, fontSize, fontKey, lineHeight, sectionGap, marginPreset, paperSize, templateId]);

  /* ── Save ── */
  const handleSave = async () => {
    setSaveStatus("saving");
    // These endpoints require a bearer token. Save, Export PDF and Export Word
    // all sent none, so each answered 401. It went unnoticed because the CSP
    // blocked the request before it ever reached the server.
    let saveToken = "";
    try { saveToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
    if (!saveToken) { setSaveStatus("error"); notifyFailure("sessionExpired"); setTimeout(() => setSaveStatus("idle"), 2500); return; }

    try {
      await saveToAccount(false);
    } catch { setSaveStatus("error"); }
    finally { setTimeout(() => setSaveStatus("idle"), 2500); }
  };

  /* ════════════════════════════════════════════════════════════════
     EXPORT PDF  -  uses Puppeteer via Spring Boot → pdf-service
     No browser print dialog, no headers/footers, perfect margins
  ════════════════════════════════════════════════════════════════ */
  const handleExportPDF = async () => {
    if (isPrinting) return;

    let pdfToken = "";
    try { pdfToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
    if (!pdfToken) { notifyFailure("sessionExpired"); return; }

    setIsPrinting(true);
    try {
      const html = buildPrintHTML(templateId, {
        ff, ac, fs, lh: lineHeight, sg: sectionGap,
        pagePad, data: resumeData, sectionOrder,
        fontUrl: fontObj.url, paperSize,
      });

      const res = await fetch(`${API_BASE}/api/v1/resume/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${pdfToken}` },
        body: JSON.stringify({ html, paperSize }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const name = resumeData.personalInfo?.name?.replace(/\s+/g, "_") || "Resume";
      a.href     = url;
      a.download = `${name}_Resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyFailure("unknown", handleExportPDF);
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════
     EXPORT WORD  -  uses docx library via Spring Boot → pdf-service
  ════════════════════════════════════════════════════════════════ */
  const handleExportWord = async () => {
    if (isExportingWord) return;

    let wordToken = "";
    try { wordToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
    if (!wordToken) { notifyFailure("sessionExpired"); return; }

    setIsExportingWord(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/resume/export-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wordToken}` },
        body: JSON.stringify({
          data: resumeData,
          styles: { ac, fs, lh: lineHeight },
        }),
      });

      if (!res.ok) throw new Error("Word generation failed");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const name = resumeData.personalInfo?.name?.replace(/\s+/g, "_") || "Resume";
      a.href     = url;
      a.download = `${name}_Resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyFailure("unknown", handleExportWord);
      console.error(err);
    } finally {
      setIsExportingWord(false);
    }
  };

  /* ── Style context passed to preview ── */
  const styleCtx = { ff, ac, fs, lh:lineHeight, sg:sectionGap, pagePad, data:resumeData, sectionOrder };

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100vw", overflow:"hidden",
      background:T.bg, fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", color:T.textPrimary }}>

      {/* ══ HEADER ══ */}
      <header style={{ height:60, flexShrink:0, background:T.bgHeader, borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", gap: narrow ? 8 : 12, padding: narrow ? "0 10px" : "0 20px", zIndex:100 }}>
        <a href="/" aria-label="Back to Replysis" style={{ display:"flex", alignItems:"center", justifyContent:"center",
          width:36, height:36, borderRadius:T.radius, color:T.textSecondary, textDecoration:"none" }}
          onMouseEnter={e=>(e.currentTarget as any).style.background=T.bg}
          onMouseLeave={e=>(e.currentTarget as any).style.background="none"}>
          <Home size={17} />
        </a>
        <div style={{ display:"flex", flexDirection:"column", lineHeight:1.25, minWidth:0 }}>
          <span style={{ fontSize:15, fontWeight:700, color:T.textPrimary, whiteSpace:"nowrap" }}>Resume builder</span>
          <span style={{ fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display: narrow ? "none" : "flex", alignItems:"center", gap:5,
            color: sync === "local" ? T.warning : T.textTertiary }}>
            {sync === "pending" || sync === "saving"
              ? <><Loader2 size={11} style={{ animation:"spin 1s linear infinite" }} /> Saving</>
              : sync === "saved"
              ? <><CheckCircle2 size={11} style={{ color:T.success }} /> Saved to your account</>
              : sync === "local"
              ? <><AlertCircle size={11} /> Saved on this computer only</>
              : (resumeData.personalInfo?.name && resumeData.personalInfo.name !== MASTER_RESUME.personalInfo?.name ? `${resumeData.personalInfo.name}'s resume` : "Your resume")}
          </span>
        </div>
        <div style={{ flex:1 }} />
        {!narrow && <CreditMeter credits={credits} max={planMax} isUnlimited={isUnlimited} plan={plan} onOpenHistory={() => setShowCreditDrawer(true)} />}
        <Tooltip tip="Save (Ctrl S)" side="bottom">
          <button onClick={handleSave}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"0 14px", height:38, borderRadius:T.radius,
              border:`1px solid ${saveStatus==="error"?T.danger:T.border}`, cursor:"pointer", fontSize:13.5, fontWeight:600,
              background:T.bgPanel, color:saveStatus==="error"?T.danger:T.textPrimary, transition:"background 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as any).style.background=T.bg}
            onMouseLeave={e=>(e.currentTarget as any).style.background=T.bgPanel}>
            {saveStatus==="saving" ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} />
              : saveStatus==="saved" ? <CheckCircle2 size={15} style={{ color:T.accent }} /> : <Save size={15} />}
            <span>{saveStatus==="saved"?"Saved":saveStatus==="error"?"Try again":saveStatus==="saving"?"Saving":"Save"}</span>
          </button>
        </Tooltip>
        {!narrow && <Tooltip tip="Download as Word (.docx)" side="bottom">
          <button onClick={handleExportWord} disabled={isExportingWord}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"0 14px", height:38, borderRadius:T.radius,
              border:`1px solid ${T.border}`, cursor:isExportingWord?"wait":"pointer", fontSize:13.5, fontWeight:600,
              background:T.bgPanel, color:T.textPrimary, opacity:isExportingWord?0.6:1 }}
            onMouseEnter={e=>(e.currentTarget as any).style.background=T.bg}
            onMouseLeave={e=>(e.currentTarget as any).style.background=T.bgPanel}>
            {isExportingWord ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> : <FileText size={15} />}
            <span>{isExportingWord?"Preparing":"Word"}</span>
          </button>
        </Tooltip>}
        <Tooltip tip="Download as PDF (Ctrl P)" side="bottom">
          <button onClick={handleExportPDF} disabled={isPrinting}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"0 18px", height:38, borderRadius:T.radius,
              border:"none", cursor:isPrinting?"wait":"pointer", fontSize:13.5, fontWeight:700,
              background:T.accent, color:"#fff", opacity:isPrinting?0.7:1, transition:"background 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as any).style.background=T.accentHover}
            onMouseLeave={e=>(e.currentTarget as any).style.background=T.accent}>
            {isPrinting ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> : <Download size={15} />}
            <span>{isPrinting ? "Preparing" : narrow ? "PDF" : "Download PDF"}</span>
          </button>
        </Tooltip>
      </header>

      {/* ══ BODY ══ */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ══ LEFT RAIL ══ */}
        <nav style={{ width: narrow ? 62 : 76, flexShrink:0, display: narrow && mobileView === "preview" ? "none" : "flex", flexDirection:"column", alignItems:"center",
          paddingTop:16, paddingBottom:16, gap:4, borderRight:`1px solid ${T.border}`, background:T.bgPanel, zIndex:20 }}>
          <Tooltip tip={sidebarCollapsed?"Expand sidebar (⌘B)":"Collapse sidebar (⌘B)"} side="right">
            <button onClick={() => setSidebarCollapsed(c => !c)}
              style={{ width:36, height:36, borderRadius:T.radius, border:`1px solid ${T.border}`,
                background:sidebarCollapsed?T.accentLight:T.bg, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:sidebarCollapsed?T.accent:T.textTertiary, transition:"all 0.15s", marginBottom:8 }}>
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </Tooltip>
          <div style={{ width:"100%", padding:"0 8px", display:"flex", flexDirection:"column", gap:3 }}>
            {([
              { id:"edit"  as TabId, icon:User,        label:"Content", tip:"Your content (Ctrl 1)",       badge:null },
              { id:"ai"    as TabId, icon:BrainCircuit, label:"Tailor",  tip:"Tailor to a job (Ctrl 2)",    badge:null },
              { id:"style" as TabId, icon:Palette,      label:"Design",  tip:"Template and fonts (Ctrl 3)", badge:null },
              { id:"ats"   as TabId, icon:Target,       label:"ATS",     tip:"ATS keyword check (Ctrl 4)",  badge:atsResult?String(atsResult.score+"%"):null },
            ] as const).map(t => {
              const active = activeTab === t.id;
              return (
                <Tooltip key={t.id} tip={t.tip} side="right">
                  <button onClick={() => setActiveTab(t.id)}
                    style={{ position:"relative", width:"100%", display:"flex", flexDirection:"column",
                      alignItems:"center", gap:3, padding:"8px 0", borderRadius:T.radius,
                      border:`1px solid ${active?T.accentLight:"transparent"}`,
                      background:active?T.accentLight:"none", cursor:"pointer", transition:"all 0.15s",
                      color:active?T.accent:T.textTertiary }}>
                    {active && (
                      <motion.div layoutId="rail-indicator"
                        style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                          width:3, height:22, borderRadius:"0 3px 3px 0", background:T.accent }} />
                    )}
                    <t.icon size={18} />
                    <span style={{ fontSize:11, fontWeight:600 }}>{t.label}</span>
                    {t.badge && (
                      <div style={{ position:"absolute", top:4, right:4, padding:"1px 5px", borderRadius:8,
                        fontSize:8, fontWeight:800, letterSpacing:"0.05em",
                        background:T.accentLight, color:T.accent }}>
                        {t.badge}
                      </div>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <div style={{ marginTop:"auto", width:"100%", padding:"0 8px", display:"flex", flexDirection:"column", gap:3 }}>
            <Tooltip tip="Answers used" side="right">
              <button onClick={() => setShowCreditDrawer(true)}
                style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  padding:"7px 0", borderRadius:T.radius, border:"none", background:"none",
                  cursor:"pointer", color:T.textTertiary, fontSize:9, fontWeight:700, transition:"all 0.15s" }}
                onMouseEnter={e=>{(e.currentTarget as any).style.color=T.accent;(e.currentTarget as any).style.background=T.accentLight;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.background="none";}}>
                <Coins size={14} /><span>Answers</span>
              </button>
            </Tooltip>
            <Tooltip tip="Reset to default" side="right">
              <button onClick={() => { if (confirm("Reset all data to default?")) { setResumeData(MASTER_RESUME); setSectionOrder(DEFAULT_ORDER); } }}
                style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  padding:"7px 0", borderRadius:T.radius, border:"none", background:"none",
                  cursor:"pointer", color:T.textTertiary, fontSize:9, fontWeight:700, transition:"all 0.15s" }}
                onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.background=T.dangerLight;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.background="none";}}>
                <RotateCcw size={14} /><span>Reset</span>
              </button>
            </Tooltip>
          </div>
        </nav>

        {/* ══ SIDEBAR ══ */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ width:0, opacity:0 }} animate={{ width: narrow ? "auto" : sidebarWidth, opacity:1 }} exit={{ width:0, opacity:0 }}
              transition={{ duration:0.22, ease:"easeInOut" }}
              style={{ flexShrink: narrow ? 1 : 0, flex: narrow ? 1 : undefined, borderRight:`1px solid ${T.border}`, overflow:"hidden",
                display: narrow && mobileView === "preview" ? "none" : "flex", flexDirection:"column", background:T.bgPanel,
                minWidth: narrow ? 0 : MIN_SIDEBAR_WIDTH, maxWidth: narrow ? "none" : MAX_SIDEBAR_WIDTH }}>
              <div style={{ padding:"18px 20px 14px", flexShrink:0 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:6 }} transition={{ duration:0.13 }}>
                    <EntPanelHeader activeTab={activeTab} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div id="editor-sidebar" style={{ flex:1, padding:"4px 16px 20px", overflowY:"auto" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }} transition={{ duration:0.16 }}>

                    {/* ══ EDIT TAB ══ */}
                    {activeTab === "edit" && (
                      <>
                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFile} style={{ display:"none" }} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                          style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 14px", marginBottom:14,
                            borderRadius:T.radiusMd, border:`1px dashed ${T.borderStrong}`, background:T.bg, cursor:importing?"wait":"pointer",
                            textAlign:"left", transition:"border-color 0.15s, background 0.15s" }}
                          onMouseEnter={e=>{(e.currentTarget as any).style.borderColor=T.accent;(e.currentTarget as any).style.background=T.accentLight;}}
                          onMouseLeave={e=>{(e.currentTarget as any).style.borderColor=T.borderStrong;(e.currentTarget as any).style.background=T.bg;}}>
                          <div style={{ width:38, height:38, borderRadius:10, background:T.bgPanel, border:`1px solid ${T.border}`,
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {importing ? <Loader2 size={17} style={{ color:T.accent, animation:"spin 1s linear infinite" }} /> : <Upload size={17} style={{ color:T.accent }} />}
                          </div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary }}>{importing ? "Reading your resume" : "Upload your resume"}</div>
                            <div style={{ fontSize:12.5, color:T.textTertiary, marginTop:1 }}>PDF, Word or text. We fill in every section for you.</div>
                          </div>
                        </button>
                        {(() => {
                          const checks = resumeChecks(resumeData);
                          const passed = checks.filter(c => c.ok).length;
                          const pct = Math.round(passed / checks.length * 100);
                          const tone = pct >= 85 ? T.success : pct >= 55 ? T.warning : T.danger;
                          const todo = checks.filter(c => !c.ok);
                          return (
                            <div style={{ marginBottom:16, padding:"14px 14px 10px", borderRadius:T.radiusMd, border:`1px solid ${T.border}`, background:T.bgPanel, boxShadow:T.shadow }}>
                              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:8 }}>
                                <span style={{ fontSize:14, fontWeight:700, color:T.textPrimary }}>Resume strength</span>
                                <span style={{ fontSize:20, fontWeight:800, color:tone, fontVariantNumeric:"tabular-nums" }}>{pct}%</span>
                              </div>
                              <div style={{ height:6, borderRadius:3, background:T.bg, overflow:"hidden", marginBottom:10 }}>
                                <motion.div initial={false} animate={{ width:`${pct}%` }} transition={{ duration:0.5 }} style={{ height:"100%", borderRadius:3, background:tone }} />
                              </div>
                              {todo.length === 0
                                ? <div style={{ fontSize:12.5, color:T.textSecondary, paddingBottom:4 }}>Everything a recruiter looks for first is here.</div>
                                : todo.slice(0, 3).map(c => (
                                  <button key={c.todo} onClick={() => setEditSection(c.section)}
                                    style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 4px", border:"none", background:"none",
                                      cursor:"pointer", fontSize:12.5, color:T.textSecondary, textAlign:"left", borderRadius:6 }}
                                    onMouseEnter={e=>{(e.currentTarget as any).style.background=T.bg;(e.currentTarget as any).style.color=T.textPrimary;}}
                                    onMouseLeave={e=>{(e.currentTarget as any).style.background="none";(e.currentTarget as any).style.color=T.textSecondary;}}>
                                    <span style={{ width:6, height:6, borderRadius:3, background:tone, flexShrink:0 }} />
                                    <span style={{ flex:1 }}>{c.todo}</span>
                                    <ChevronRight size={13} style={{ color:T.textTertiary }} />
                                  </button>
                                ))}
                              {todo.length > 3 && <div style={{ fontSize:11.5, color:T.textTertiary, padding:"4px 4px 2px" }}>{todo.length - 3} more after these</div>}
                            </div>
                          );
                        })()}
                        <p style={{ fontSize:13, lineHeight:1.55, color:T.textSecondary, margin:"2px 2px 14px" }}>
                          Open a section to edit it. The preview updates as you type, and clicking any part of it brings you here.
                        </p>

                        {/* ══ ACCORDION NAV ══ */}
                        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                          {[
                            { id:"personal",       label:"Personal info",  Icon:User,        color:T.accent,        bg:T.accentLight },
                            ...sectionOrder.map(id => ({ id, ...SECTION_META[id] })),
                            ...customSections.map(cs => ({ id:cs.id, label:cs.title, Icon:Plus, color:T.accent, bg:T.accentLight })),
                            { id:"order",          label:"Section order",  Icon:Layers,      color:T.textSecondary, bg:"rgba(107,100,96,0.07)" },
                          ].map(item => {
                            const active = editSection === item.id;
                            const done   = (item.id !== "order" && !item.id.startsWith("custom_")) ? sectionComplete(item.id as any) : true;
                            return (
                              <div key={item.id} style={{ marginBottom: active ? 6 : 2 }}>
                                {/* ── Section header button ── */}
                                <button
                                  onClick={() => setEditSection(active ? "" : item.id)}
                                  style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 12px",
                                    borderRadius: active ? `${T.radius} ${T.radius} 0 0` : T.radius,
                                    cursor:"pointer",
                                    border:`1px solid ${active ? item.color+"40" : "transparent"}`,
                                    borderBottom: active ? "none" : `1px solid transparent`,
                                    background:active ? item.bg : "none",
                                    color:active ? item.color : T.textSecondary,
                                    fontSize:14, fontWeight:600, transition:"all 0.15s", textAlign:"left" }}
                                  onMouseEnter={e=>{if(!active){(e.currentTarget as any).style.background=item.bg;(e.currentTarget as any).style.color=item.color;}}}
                                  onMouseLeave={e=>{if(!active){(e.currentTarget as any).style.background="none";(e.currentTarget as any).style.color=T.textSecondary;}}}>
                                  <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                                    background:active ? item.color+"20" : T.bg,
                                    border:`1px solid ${active ? item.color+"40" : T.border}` }}>
                                    <item.Icon size={15} style={{ color:item.color }} />
                                  </div>
                                  <span style={{ flex:1 }}>{item.label}</span>
                                  {item.id !== "order" && !item.id.startsWith("custom_") && <CompletionDot complete={done} />}
                                  <ChevronDown size={12} style={{ color:item.color, opacity:0.5,
                                    transform: active ? "rotate(180deg)" : "rotate(0deg)",
                                    transition:"transform 0.2s" }} />
                                </button>

                                {/* ── Inline expanded content ── */}
                                <AnimatePresence initial={false}>
                                  {active && (
                                    <motion.div
                                      key={item.id + "-panel"}
                                      initial={{ height:0, opacity:0 }}
                                      animate={{ height:"auto", opacity:1 }}
                                      exit={{ height:0, opacity:0 }}
                                      transition={{ duration:0.22, ease:"easeInOut" }}
                                      style={{ overflow:"hidden",
                                        border:`1px solid ${item.color}40`,
                                        borderTop:"none",
                                        borderRadius:`0 0 ${T.radius} ${T.radius}`,
                                        background:T.bgPanel }}>
                                      <div style={{ padding:"16px 14px 14px" }}>

                                        {/* PERSONAL INFO */}
                                        {item.id === "personal" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                              {[{l:"Full Name",f:"name",p:"John Doe"},{l:"Headline",f:"headline",p:"Software Engineer"},{l:"Email",f:"email",p:"john@example.com"},{l:"Phone",f:"phone",p:"+1 (555) 000-0000"},{l:"Location",f:"location",p:"New York, NY"}].map(({l,f,p})=>(
                                                <div key={f} id={`field-personal-${f}`}><Label>{l}</Label><Inp value={resumeData.personalInfo?.[f]||""} onChange={(e:any)=>updateInfo(f,e.target.value)} placeholder={p} /></div>
                                              ))}
                                            </div>
                                            <Divider />
                                            <div style={{ fontSize:12, fontWeight:700, color:T.accent, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                                              <LinkIcon size={12} /> Links
                                            </div>
                                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                                              {[{l:"LinkedIn",f:"linkedin",p:"linkedin.com/in/you"},{l:"GitHub",f:"github",p:"github.com/you"},{l:"Portfolio",f:"portfolio",p:"yoursite.com"}].map(({l,f,p})=>(
                                                <div key={f} id={`field-personal-${f}`}><Label>{l}</Label><Inp value={resumeData.personalInfo?.[f]||""} onChange={(e:any)=>updateInfo(f,e.target.value)} placeholder={p} /></div>
                                              ))}
                                            </div>
                                            <div style={{ marginTop:12 }}>
                                              <Label>Custom Links</Label>
                                              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                                {(resumeData.personalInfo?.customLinks||[]).map((link:any,i:number)=>(
                                                  <div key={i} style={{ display:"flex", gap:5 }}>
                                                    <input value={link.label||""} onChange={e=>updateCustomLink(i,"label",e.target.value)} placeholder="Label"
                                                      style={{ width:"35%", background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"7px 9px", fontSize:12, color:T.textPrimary, outline:"none" }} />
                                                    <input value={link.url||""} onChange={e=>updateCustomLink(i,"url",e.target.value)} placeholder="https://..."
                                                      style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"7px 9px", fontSize:12, color:T.textPrimary, outline:"none" }} />
                                                    <button onClick={()=>removeCustomLink(i)} style={{ padding:6, border:"none", background:"none", cursor:"pointer", color:T.textTertiary }}
                                                      onMouseEnter={e=>(e.currentTarget as any).style.color=T.danger} onMouseLeave={e=>(e.currentTarget as any).style.color=T.textTertiary}>
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                              <AddButton onClick={addCustomLink} label="Add link" color={T.accent} />
                                            </div>
                                          </>
                                        )}

                                        {/* SUMMARY */}
                                        {item.id === "summary" && (
                                          <>
                                            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:8 }}>
                                              <WordCountBadge text={resumeData.summary||""} />
                                              <button onClick={handleGenerateSummary} disabled={loading}
                                                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:T.radius,
                                                  border:`1px solid ${T.accent}30`, background:T.accentLight, color:T.accent,
                                                  fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s", opacity:loading?0.5:1 }}>
                                                {loading&&aiAction==="summary" ? <Loader2 size={11} style={{ animation:"spin 1s linear infinite" }} /> : <Wand2 size={11} />}
                                                AI Generate
                                              </button>
                                            </div>
                                            <div id="field-summary"><Textarea value={resumeData.summary||""} onChange={(e:any)=>set(d=>({...d,summary:e.target.value}))} rows={8} placeholder="Professional summary..." /></div>
                                            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:6 }}>
                                              <Coins size={10} style={{ color:T.textTertiary }} />
                                              <p style={{ fontSize:10, color:T.textTertiary, margin:0 }}>AI Generate uses <strong>1 answer</strong></p>
                                            </div>
                                          </>
                                        )}

                                        {/* EXPERIENCE */}
                                        {item.id === "experience" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                              {(resumeData.experience||[]).map((exp:any,i:number)=>(
                                                <div key={i} id={`editor-experience-${i}`}><SectionCard>
                                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                                    <span style={{ fontSize:12, fontWeight:700, color:"#1C7A3E" }}>{exp.company||`Experience #${i+1}`}</span>
                                                    <button onClick={()=>removeExperience(i)} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:4 }}
                                                      onMouseEnter={e=>(e.currentTarget as any).style.color=T.danger} onMouseLeave={e=>(e.currentTarget as any).style.color=T.textTertiary}>
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:7 }}>
                                                    <div><Label>Company</Label><Inp value={exp.company||""} onChange={(e:any)=>updateExperience(i,"company",e.target.value)} /></div>
                                                    <div><Label>Role</Label><Inp value={exp.role||""} onChange={(e:any)=>updateExperience(i,"role",e.target.value)} /></div>
                                                  </div>
                                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10 }}>
                                                    <div><Label>Location</Label><Inp value={exp.location||""} onChange={(e:any)=>updateExperience(i,"location",e.target.value)} /></div>
                                                    <div><Label>Period</Label><Inp value={exp.period||""} onChange={(e:any)=>updateExperience(i,"period",e.target.value)} /></div>
                                                  </div>
                                                  <Label>Bullets</Label>
                                                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                                    {(exp.bullets||[]).map((b:string,bi:number)=>(
                                                      <div key={bi} style={{ display:"flex", gap:5 }}>
                                                        <Textarea value={b} onChange={(e:any)=>updateBullet("experience",i,bi,e.target.value)} rows={2} />
                                                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                                          <Tooltip tip="AI rewrite (1 answer)" side="right">
                                                            <button onClick={()=>handleRewriteBullet("experience",i,bi)} disabled={rewritingBullet===`experience-${i}-${bi}`}
                                                              style={{ padding:5, border:`1px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                              onMouseEnter={e=>{(e.currentTarget as any).style.color=T.purple;(e.currentTarget as any).style.borderColor=T.purple+"50";}}
                                                              onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                              {rewritingBullet===`experience-${i}-${bi}` ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                                                            </button>
                                                          </Tooltip>
                                                          <button onClick={()=>removeBullet("experience",i,bi)}
                                                            style={{ padding:5, border:`1px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                            onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.borderColor=T.danger+"40";}}
                                                            onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                            <Trash2 size={12} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  <AddButton onClick={()=>addBullet("experience",i)} label="Add bullet point" color="#1C7A3E" small />
                                                </SectionCard></div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addExperience} label="Add experience" color="#1C7A3E" />
                                          </>
                                        )}

                                        {/* PROJECTS */}
                                        {item.id === "projects" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                              {(resumeData.projects||[]).map((p:any,i:number)=>(
                                                <div key={i} id={`editor-projects-${i}`}><SectionCard>
                                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                                    <span style={{ fontSize:12, fontWeight:700, color:T.purple }}>{p.title||`Project #${i+1}`}</span>
                                                    <button onClick={()=>removeProject(i)} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:4 }}
                                                      onMouseEnter={e=>(e.currentTarget as any).style.color=T.danger} onMouseLeave={e=>(e.currentTarget as any).style.color=T.textTertiary}>
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:7 }}>
                                                    <div><Label>Title</Label><Inp value={p.title||p.name||""} onChange={(e:any)=>updateProject(i,"title",e.target.value)} /></div>
                                                    <div><Label>Period</Label><Inp value={p.period||""} onChange={(e:any)=>updateProject(i,"period",e.target.value)} /></div>
                                                  </div>
                                                  <div style={{ marginBottom:10 }}><Label>Tech Stack</Label><Inp value={p.tech||""} onChange={(e:any)=>updateProject(i,"tech",e.target.value)} /></div>
                                                  <Label>Bullets</Label>
                                                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                                    {(p.bullets||[]).map((b:string,bi:number)=>(
                                                      <div key={bi} style={{ display:"flex", gap:5 }}>
                                                        <Textarea value={b} onChange={(e:any)=>updateBullet("projects",i,bi,e.target.value)} rows={2} />
                                                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                                          <Tooltip tip="AI rewrite (1 answer)" side="right">
                                                            <button onClick={()=>handleRewriteBullet("projects",i,bi)} disabled={rewritingBullet===`projects-${i}-${bi}`}
                                                              style={{ padding:5, border:`1px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                              onMouseEnter={e=>{(e.currentTarget as any).style.color=T.purple;(e.currentTarget as any).style.borderColor=T.purple+"50";}}
                                                              onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                              {rewritingBullet===`projects-${i}-${bi}` ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                                                            </button>
                                                          </Tooltip>
                                                          <button onClick={()=>removeBullet("projects",i,bi)}
                                                            style={{ padding:5, border:`1px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                            onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.borderColor=T.danger+"40";}}
                                                            onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                            <Trash2 size={12} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  <AddButton onClick={()=>addBullet("projects",i)} label="Add bullet point" color={T.purple} small />
                                                </SectionCard></div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addProject} label="Add project" color={T.purple} />
                                          </>
                                        )}

                                        {/* EDUCATION */}
                                        {item.id === "education" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                              {(resumeData.education||[]).map((e:any,i:number)=>(
                                                <div key={i} id={`editor-education-${i}`}><SectionCard>
                                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                                    <span style={{ fontSize:12, fontWeight:700, color:T.success }}>{e.school||`Education #${i+1}`}</span>
                                                    <button onClick={()=>removeEducation(i)} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:4 }}
                                                      onMouseEnter={ev=>(ev.currentTarget as any).style.color=T.danger} onMouseLeave={ev=>(ev.currentTarget as any).style.color=T.textTertiary}>
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                  <div style={{ marginBottom:7 }}><Label>School</Label><Inp value={e.school||e.institution||""} onChange={(ev:any)=>updateEducation(i,"school",ev.target.value)} /></div>
                                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:7 }}>
                                                    <div><Label>Degree</Label><Inp value={e.degree||""} onChange={(ev:any)=>updateEducation(i,"degree",ev.target.value)} /></div>
                                                    <div><Label>Period</Label><Inp value={e.period||e.year||""} onChange={(ev:any)=>updateEducation(i,"period",ev.target.value)} /></div>
                                                  </div>
                                                  <div><Label>GPA</Label><Inp value={e.gpa||""} onChange={(ev:any)=>updateEducation(i,"gpa",ev.target.value)} /></div>
                                                </SectionCard></div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addEducation} label="Add education" color={T.success} />
                                          </>
                                        )}

                                        {/* SKILLS */}
                                        {item.id === "skills" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                              {(resumeData.skillCategories||[]).map((c:any,i:number)=>(
                                                <div key={i} id={`editor-skills-${i}`}><SectionCard>
                                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                                    <span style={{ fontSize:12, fontWeight:700, color:T.warning }}>{c.name||`Category #${i+1}`}</span>
                                                    <button onClick={()=>removeSkillCategory(i)} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:4 }}
                                                      onMouseEnter={e=>(e.currentTarget as any).style.color=T.danger} onMouseLeave={e=>(e.currentTarget as any).style.color=T.textTertiary}>
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                  <div style={{ marginBottom:7 }}><Label>Category Name</Label><Inp value={c.name||""} onChange={(e:any)=>updateSkillCategory(i,"name",e.target.value)} /></div>
                                                  <div><Label>Skills (comma separated)</Label><Textarea value={c.skills||""} onChange={(e:any)=>updateSkillCategory(i,"skills",e.target.value)} rows={2} /></div>
                                                </SectionCard></div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addSkillCategory} label="Add category" color={T.warning} />
                                          </>
                                        )}

                                        {/* CERTIFICATIONS */}
                                        {item.id === "certifications" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                                              {(resumeData.certifications||[]).map((c:any,i:number)=>(
                                                <div key={i} style={{ display:"flex", gap:5 }}>
                                                  <Inp value={typeof c==="string"?c:c?.name||""} onChange={(e:any)=>updateCertification(i,e.target.value)} placeholder="AWS Certified - Amazon (2024)" />
                                                  <button onClick={()=>removeCertification(i)} style={{ padding:6, border:`1px solid ${T.border}`, borderRadius:T.radius, background:T.bg, cursor:"pointer", color:T.textTertiary, flexShrink:0, transition:"all 0.15s" }}
                                                    onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.borderColor=T.danger+"40";}}
                                                    onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addCertification} label="Add certification" color="#21924A" />
                                          </>
                                        )}

                                        {/* CUSTOM SECTION */}
                                        {item.id.startsWith("custom_") && (() => {
                                          const cs = customSections.find(s => s.id === item.id);
                                          if (!cs) return null;
                                          return (
                                            <>
                                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                                                <input value={cs.title} onChange={e=>updateCustomSectionTitle(cs.id, e.target.value)}
                                                  placeholder="Section Title"
                                                  style={{ background:"none", border:"none", outline:"none", fontSize:13, fontWeight:700,
                                                    color:T.textPrimary, fontFamily:"inherit", borderBottom:`1px solid #A04E2C40`, paddingBottom:2 }} />
                                                <button onClick={()=>removeCustomSection(cs.id)}
                                                  style={{ padding:"3px 8px", borderRadius:T.radius, border:`1px solid ${T.danger}30`,
                                                    background:T.dangerLight, color:T.danger, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                                                  Delete
                                                </button>
                                              </div>
                                              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                                {cs.items.map((entry:any, idx:number) => (
                                                  <SectionCard key={idx}>
                                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                                      <span style={{ fontSize:11, fontWeight:700, color:"#A04E2C" }}>{entry.title||`Entry ${idx+1}`}</span>
                                                      <button onClick={()=>removeCustomSectionItem(cs.id,idx)} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:2 }}
                                                        onMouseEnter={e=>(e.currentTarget as any).style.color=T.danger}
                                                        onMouseLeave={e=>(e.currentTarget as any).style.color=T.textTertiary}>
                                                        <Trash2 size={12} />
                                                      </button>
                                                    </div>
                                                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:7 }}>
                                                      <div><Label>Title</Label><Inp value={entry.title} onChange={(e:any)=>updateCustomSectionItem(cs.id,idx,"title",e.target.value)} placeholder="Award Name" /></div>
                                                      <div><Label>Subtitle</Label><Inp value={entry.subtitle} onChange={(e:any)=>updateCustomSectionItem(cs.id,idx,"subtitle",e.target.value)} placeholder="Organisation" /></div>
                                                    </div>
                                                    <div style={{ marginBottom:7 }}><Label>Date / Period</Label><Inp value={entry.date} onChange={(e:any)=>updateCustomSectionItem(cs.id,idx,"date",e.target.value)} placeholder="Jan 2024" /></div>
                                                    <div><Label>Description</Label><Textarea value={entry.description} rows={3} onChange={(e:any)=>updateCustomSectionItem(cs.id,idx,"description",e.target.value)} placeholder="Describe this entry..." /></div>
                                                  </SectionCard>
                                                ))}
                                              </div>
                                              <AddButton onClick={()=>addCustomSectionItem(cs.id)} label="Add entry" color="#A04E2C" />
                                            </>
                                          );
                                        })()}

                                        {/* SECTION ORDER */}
                                        {item.id === "order" && (
                                          <>
                                            <p style={{ fontSize:11, color:T.textTertiary, marginBottom:12, lineHeight:1.6 }}>Drag sections up/down to reorder on your resume.</p>
                                            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                                              {sectionOrder.map((id,idx)=>{
                                                const m = SECTION_META[id];
                                                return (
                                                  <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 10px",
                                                    background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.radiusMd }}>
                                                    <GripVertical size={13} style={{ color:T.textTertiary }} />
                                                    <div style={{ width:22, height:22, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
                                                      background:m.color+"15", border:`1px solid ${m.color}25` }}>
                                                      <m.Icon size={11} style={{ color:m.color }} />
                                                    </div>
                                                    <span style={{ flex:1, fontSize:12, fontWeight:600, color:T.textSecondary }}>{m.label}</span>
                                                    <div style={{ display:"flex", gap:2 }}>
                                                      <button onClick={()=>moveSection(idx,-1)} disabled={idx===0}
                                                        style={{ padding:4, borderRadius:5, border:`1px solid ${T.border}`, background:T.bgPanel, cursor:idx===0?"not-allowed":"pointer", color:idx===0?T.textTertiary+"50":T.textTertiary }}>
                                                        <ChevronUp size={12} />
                                                      </button>
                                                      <button onClick={()=>moveSection(idx,1)} disabled={idx===sectionOrder.length-1}
                                                        style={{ padding:4, borderRadius:5, border:`1px solid ${T.border}`, background:T.bgPanel, cursor:idx===sectionOrder.length-1?"not-allowed":"pointer", color:idx===sectionOrder.length-1?T.textTertiary+"50":T.textTertiary }}>
                                                        <ChevronDown size={12} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </>
                                        )}

                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Custom Section button */}
                        <button onClick={addCustomSection}
                          style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                            borderRadius:T.radius, cursor:"pointer", border:`1px dashed #A04E2C40`,
                            background:"rgba(33,146,74,0.04)", color:"#A04E2Ccc",
                            fontSize:11, fontWeight:700, transition:"all 0.13s", marginTop:8 }}
                          onMouseEnter={e=>{(e.currentTarget as any).style.background="rgba(33,146,74,0.10)";(e.currentTarget as any).style.borderColor="#A04E2C80";(e.currentTarget as any).style.color="#A04E2C";}}
                          onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(33,146,74,0.04)";(e.currentTarget as any).style.borderColor="#A04E2C40";(e.currentTarget as any).style.color="#A04E2Ccc";}}>
                          <Plus size={12} /> Add Custom Section
                        </button>
                      </>
                    )}

                    {/* ══ AI TAB ══ */}
                    {activeTab === "ai" && (
                      <>
                        {!isUnlimited && credits < 25 && (
                          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                            style={{ padding:"10px 12px", borderRadius:T.radiusMd, marginBottom:14,
                              background:T.dangerLight, border:`1px solid ${T.danger}25`,
                              display:"flex", alignItems:"center", gap:10 }}>
                            <AlertCircle size={14} style={{ color:T.danger, flexShrink:0 }} />
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:T.danger }}>Low on answers</div>
                              <div style={{ fontSize:10, color:T.textSecondary }}>{answersLabel(credits)} left. Tailoring uses 4.</div>
                            </div>
                            <button onClick={() => window.location.href="/pricing"}
                              style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:T.radius, border:"none",
                                background:T.danger, color:"#fff", fontSize:10, fontWeight:800, cursor:"pointer", flexShrink:0 }}>
                              Upgrade
                            </button>
                          </motion.div>
                        )}
                        <Label>Job post or keywords</Label>
                        <Textarea value={jd} onChange={(e:any)=>setJd(e.target.value)}
                          placeholder={"Paste the job post here. Even a few words work, for example: Java backend developer, Spring Boot, AWS"} rows={11} />
                        <p style={{ fontSize:12.5, color:T.textTertiary, margin:"8px 2px 14px", lineHeight:1.5 }}>
                          Your summary, skills and bullet points are rewritten for this job. Nothing is made up, and you can undo it.
                        </p>
                        <button onClick={handleTailor} disabled={loading||!jd.trim()}
                          style={{ width:"100%", height:46, borderRadius:T.radius, border:"none",
                            fontSize:14.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                            cursor:loading||!jd.trim()?"not-allowed":"pointer", transition:"background 0.15s",
                            background:!jd.trim()?T.border:T.accent, color:!jd.trim()?T.textTertiary:"#fff" }}
                          onMouseEnter={e=>{ if (!loading && jd.trim()) (e.currentTarget as any).style.background=T.accentHover; }}
                          onMouseLeave={e=>{ if (!loading && jd.trim()) (e.currentTarget as any).style.background=T.accent; }}>
                          {loading&&aiAction==="tailoring"
                            ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> Tailoring your resume</>
                            : <><Sparkles size={16} /> Tailor my resume</>}
                        </button>
                        <p style={{ textAlign:"center", fontSize:12, color:T.textTertiary, marginTop:8 }}>
                          Uses 4 answers{isUnlimited ? "" : `. You have ${answerCount(credits)}.`}
                        </p>
                        {showDiff && prevResume && (
                          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                            style={{ marginTop:14, padding:14, background:T.successLight,
                              border:`1px solid ${T.success}25`, borderRadius:T.radiusMd }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                              <CheckCircle2 size={14} style={{ color:T.success }} />
                              <span style={{ fontSize:13.5, fontWeight:700, color:T.success }}>Your resume is tailored</span>
                            </div>
                            {(() => {
                              const before = scanATS(prevResume, jd).score, after = scanATS(resumeData, jd).score;
                              return after > before ? (
                                <div style={{ display:"flex", alignItems:"center", gap:8, margin:"4px 0 10px", fontSize:13, color:T.textPrimary, fontWeight:600 }}>
                                  <TrendingUp size={15} style={{ color:T.success }} />
                                  Job match went from {before}% to {after}%
                                </div>
                              ) : null;
                            })()}
                            <p style={{ fontSize:12.5, color:T.textSecondary, lineHeight:1.55, marginBottom:12 }}>Check the preview. Keep it, or undo to go back to your previous version.</p>
                            <div style={{ display:"flex", gap:7 }}>
                              <button onClick={()=>{ setResumeData(prevResume); setShowDiff(false); }}
                                style={{ flex:1, padding:"8px 0", borderRadius:T.radius, border:`1px solid ${T.danger}30`, background:T.dangerLight, color:T.danger, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                <RotateCcw size={11} /> Undo
                              </button>
                              <button onClick={()=>setShowDiff(false)}
                                style={{ flex:1, padding:"8px 0", borderRadius:T.radius, border:`1px solid ${T.success}30`, background:T.successLight, color:T.success, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                <CheckCircle2 size={11} /> Keep
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}

                    {/* ══ STYLE TAB ══ */}
                    {activeTab === "style" && (
                      <>
                        <div style={{ marginBottom:20 }}>
                          <Label>Template</Label>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                            {TEMPLATE_LIST.map(t=>{
                              const isSelected = templateId===t.id;
                              return (
                                <button key={t.id} onClick={()=>setTemplateId(t.id)}
                                  style={{ position:"relative", textAlign:"left", cursor:"pointer",
                                    borderRadius:T.radiusMd, border:`1px solid ${isSelected?ac:T.border}`,
                                    overflow:"hidden", background:T.bgPanel, padding:0,
                                    transform:isSelected?"translateY(-1px)":"none",
                                    boxShadow:isSelected?`0 4px 14px ${ac}22`:T.shadow, transition:"all 0.15s" }}>
                                  <div style={{ width:"100%", aspectRatio:"0.707", background:"#fff", overflow:"hidden", position:"relative" }}
                                    dangerouslySetInnerHTML={{ __html:getTemplateThumbnail(t.id,ac) }} />
                                  {isSelected && (
                                    <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:"50%", background:ac, boxShadow:`0 0 6px ${ac}` }} />
                                  )}
                                  <div style={{ padding:"7px 8px", borderTop:`1px solid ${T.border}`, background:isSelected?ac+"08":T.bg }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
                                      <span style={{ fontSize:11, fontWeight:700, color:isSelected?ac:T.textSecondary }}>{t.name}</span>
                                      {t.ats && <span style={{ fontSize:8, fontWeight:800, padding:"1px 5px", borderRadius:5, background:T.successLight, color:T.success, border:`1px solid ${T.success}25` }}>ATS</span>}
                                    </div>
                                    <div style={{ fontSize:9, color:T.textTertiary }}>{t.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ marginBottom:18 }}>
                          <Label>Accent Color</Label>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:10 }}>
                            {COLORS.map(c=>(
                              <button key={c} onClick={()=>setAccentColor(c)}
                                style={{ width:24, height:24, borderRadius:"50%", border:"none", cursor:"pointer", background:c, transition:"all 0.15s",
                                  transform:ac===c?"scale(1.25)":"scale(1)", boxShadow:ac===c?`0 0 0 2.5px #fff,0 0 0 4px ${c}`:"none" }} />
                            ))}
                          </div>
                          <input type="color" value={ac} onChange={e=>setAccentColor(e.target.value)}
                            style={{ width:"100%", height:32, background:"none", border:`1px solid ${T.border}`, borderRadius:T.radius, cursor:"pointer", padding:2 }} />
                        </div>
                        <div style={{ marginBottom:18 }}>
                          <Label>Font Family</Label>
                          <div style={{ display:"flex", gap:3, marginBottom:8, background:T.bg, borderRadius:T.radius, border:`1px solid ${T.border}`, padding:3 }}>
                            {(["all","Serif","Sans","Mono"] as const).map(cat=>(
                              <button key={cat} onClick={()=>setFontFilter(cat)}
                                style={{ flex:1, padding:"5px 0", borderRadius:5, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, transition:"all 0.15s",
                                  background:fontFilter===cat?T.bgPanel:"none", color:fontFilter===cat?T.textPrimary:T.textTertiary, boxShadow:fontFilter===cat?T.shadow:"none" }}>
                                {cat==="all"?"All":cat}
                              </button>
                            ))}
                          </div>
                          <div style={{ maxHeight:160, overflowY:"auto", borderRadius:T.radiusMd, border:`1px solid ${T.border}`, background:T.bgPanel }}>
                            {FONTS.filter(f=>fontFilter==="all"||f.cat===fontFilter).map(f=>(
                              <button key={f.key} onClick={()=>setFontKey(f.key)}
                                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                                  padding:"9px 12px", borderBottom:`1px solid ${T.border}`, border:"none",
                                  background:fontKey===f.key?T.accentLight:"none", cursor:"pointer", transition:"background 0.1s" }}>
                                <span style={{ fontSize:12, fontWeight:600, color:fontKey===f.key?T.accent:T.textSecondary }}>{f.label}</span>
                                <span style={{ fontSize:9, color:T.textTertiary, textTransform:"uppercase", letterSpacing:"0.08em" }}>{f.cat}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginBottom:18, display:"flex", flexDirection:"column", gap:14 }}>
                          {[
                            {label:"Font Size",   val:`${fs}px`,        min:8,   max:14,  step:0.5,  value:fs,        setter:setFontSize  },
                            {label:"Line Spacing",val:`${lineHeight}×`, min:1.2, max:2.0, step:0.05, value:lineHeight, setter:setLineHeight },
                            {label:"Section Gap", val:`${sectionGap}px`,min:8,   max:28,  step:2,    value:sectionGap, setter:setSectionGap},
                          ].map(s=>(
                            <div key={s.label}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                                <span style={{ fontSize:11, fontWeight:600, color:T.textSecondary }}>{s.label}</span>
                                <span style={{ fontSize:11, fontWeight:700, color:T.textPrimary }}>{s.val}</span>
                              </div>
                              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                                onChange={e=>s.setter(parseFloat(e.target.value) as any)}
                                style={{ width:"100%", height:4, accentColor:T.accent }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom:14 }}>
                          <Label>Page Margins</Label>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                            {(["narrow","normal","wide"] as const).map(m=>(
                              <button key={m} onClick={()=>setMarginPreset(m)}
                                style={{ padding:"8px 0", borderRadius:T.radius, border:`1px solid ${marginPreset===m?T.accent+"50":T.border}`,
                                  background:marginPreset===m?T.accentLight:T.bg, color:marginPreset===m?T.accent:T.textSecondary,
                                  fontSize:11, fontWeight:700, cursor:"pointer", textTransform:"capitalize", transition:"all 0.15s" }}>
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Paper Size</Label>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                            {(["a4","letter"] as const).map(k=>(
                              <button key={k} onClick={()=>setPaperSize(k)}
                                style={{ padding:"8px 0", borderRadius:T.radius, border:`1px solid ${paperSize===k?T.accent+"50":T.border}`,
                                  background:paperSize===k?T.accentLight:T.bg, color:paperSize===k?T.accent:T.textSecondary,
                                  fontSize:11, fontWeight:700, cursor:"pointer", textTransform:"uppercase", transition:"all 0.15s" }}>
                                {k}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ══ ATS TAB ══ */}
                    {activeTab === "ats" && (
                      <>
                        <Label>Job post</Label>
                        <Textarea value={jd} onChange={(e:any)=>setJd(e.target.value)}
                          placeholder="Paste the job post here. The same text you used for Tailor works." rows={9} />
                        <button onClick={runATS} disabled={!jd.trim()}
                          style={{ width:"100%", marginTop:12, height:46, borderRadius:T.radius, border:"none",
                            fontSize:14.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                            cursor:!jd.trim()?"not-allowed":"pointer", transition:"background 0.15s",
                            background:!jd.trim()?T.border:T.accent, color:!jd.trim()?T.textTertiary:"#fff" }}>
                          <BarChart3 size={16} /> Check keywords
                        </button>
                        <p style={{ textAlign:"center", fontSize:12, color:T.textTertiary, marginTop:8 }}>Free, uses no answers</p>
                        {atsResult && (
                          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} style={{ marginTop:14, display:"flex", flexDirection:"column", gap:12 }}>
                            <div style={{ textAlign:"center", padding:"18px 0", background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.radiusMd }}>
                              <div style={{ fontSize:48, fontWeight:900, lineHeight:1, color:atsResult.score>=70?T.success:atsResult.score>=40?T.warning:T.danger }}>
                                {atsResult.score}%
                              </div>
                              <div style={{ fontSize:11, color:T.textTertiary, marginTop:5 }}>ATS match: {atsResult.found.length} of {atsResult.total} keywords</div>
                              <div style={{ width:"70%", height:5, borderRadius:3, background:T.border, margin:"12px auto 0", overflow:"hidden" }}>
                                <motion.div initial={{ width:0 }} animate={{ width:`${atsResult.score}%` }} transition={{ duration:0.8 }}
                                  style={{ height:"100%", borderRadius:3, background:atsResult.score>=70?T.success:atsResult.score>=40?T.warning:T.danger }} />
                              </div>
                            </div>
                            {atsResult.found.length > 0 && (
                              <div>
                                <div style={{ fontSize:13, color:T.success, fontWeight:700, marginBottom:8 }}>On your resume ({atsResult.found.length})</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                  {atsResult.found.map((k:string)=>(
                                    <span key={k} style={{ padding:"4px 9px", borderRadius:20, fontSize:11.5, fontWeight:600, background:T.successLight, color:T.success, border:`1px solid ${T.success}25` }}>{k}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {atsResult.missing.length > 0 && (
                              <div>
                                <div style={{ fontSize:13, color:T.danger, fontWeight:700, marginBottom:8 }}>Missing from your resume ({atsResult.missing.length})</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                  {atsResult.missing.map((k:string)=>(
                                    <button key={k} onClick={() => addSkillFromAts(k)} title={`Add ${k} to your skills`}
                                      style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:20, fontSize:11.5, fontWeight:600, cursor:"pointer",
                                        background:T.dangerLight, color:T.danger, border:`1px solid ${T.danger}25` }}>
                                      <Plus size={11} /> {k}
                                    </button>
                                  ))}
                                </div>
                                <p style={{ fontSize:12, color:T.textTertiary, lineHeight:1.5, margin:"8px 2px 0" }}>
                                  Have one of these? Tap it to add it to your skills. Only add what you can talk about in the interview.
                                </p>
                              </div>
                            )}
                            {atsResult.score < 80 && (
                              <div style={{ padding:14, borderRadius:T.radiusMd, border:`1px solid ${T.border}`, background:T.bgPanel }}>
                                <div style={{ fontSize:13.5, fontWeight:700, color:T.textPrimary, marginBottom:4 }}>Raise your match</div>
                                <p style={{ fontSize:12.5, color:T.textSecondary, lineHeight:1.55, margin:"0 0 10px" }}>
                                  Tailor rewrites your summary, title and bullets for this job, using the same job post. It never adds experience you do not have.
                                </p>
                                <button onClick={() => setActiveTab("ai")}
                                  style={{ width:"100%", height:40, borderRadius:T.radius, border:"none", background:T.accent, color:"#fff",
                                    fontSize:13.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                                  <Sparkles size={15} /> Tailor for this job
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </>
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ DRAGGABLE DIVIDER ══ */}
        {!sidebarCollapsed && !narrow && (
          <div onMouseDown={handleDividerMouseDown} onDoubleClick={handleDividerDoubleClick}
            title="Drag to resize. Double click to reset"
            style={{ width:5, flexShrink:0, position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"col-resize", zIndex:30, background:T.border, transition:"background 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as any).style.background=T.accent+"60"}
            onMouseLeave={e=>(e.currentTarget as any).style.background=T.border}>
            <div style={{ display:"flex", flexDirection:"column", gap:3, opacity:0.4 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:3, height:3, borderRadius:"50%", background:T.textTertiary }} />)}
            </div>
          </div>
        )}

        {/* ══ PREVIEW PANEL ══ */}
        {narrow && (
          <button onClick={() => setMobileView(v => v === "edit" ? "preview" : "edit")}
            style={{ position:"fixed", bottom:18, left:"50%", transform:"translateX(-50%)", zIndex:200,
              display:"flex", alignItems:"center", gap:8, height:46, padding:"0 22px", borderRadius:23, border:"none",
              background:T.accent, color:"#fff", fontSize:14.5, fontWeight:700, boxShadow:T.shadowLg, cursor:"pointer" }}>
            {mobileView === "edit" ? <><Eye size={17} /> Preview</> : <><PenLine size={17} /> Edit</>}
          </button>
        )}
        <div style={{ display: narrow && mobileView === "edit" ? "none" : "flex", flex:1, minWidth:0 }}>
        <ResumePreview
          paper={paper}
          paperSize={paperSize}
          templateId={templateId}
          styleCtx={styleCtx}
          fontObj={fontObj}
          onShowShortcuts={() => setShowShortcuts(true)}
          onSectionClick={(key) => {
            const [base, idx] = key.split(":");
            const sectionMap: Record<string, "personal"|"summary"|"experience"|"projects"|"education"|"skills"|"certifications"> = {
              personal:"personal", summary:"summary", experience:"experience",
              projects:"projects", education:"education", skills:"skills", certifications:"certifications",
            };
            const target = sectionMap[base];
            if (!target) return;

            let fieldId: string | null = null;
            if (target === "personal") fieldId = "field-personal-name";
            else if (target === "summary") fieldId = "field-summary";
            else if (idx !== undefined && idx !== "heading") {
              fieldId = `editor-${base}-${idx}`;
            }

            setActiveTab("edit");
            setEditSection(target);

            // Wait for React to render the section, then scroll + highlight
            setTimeout(() => {
              const el = fieldId ? document.getElementById(fieldId) : null;
              const sidebar = document.getElementById("editor-sidebar");
              if (el && sidebar) {
                // Scroll the sidebar to the element
                const elTop = el.getBoundingClientRect().top;
                const sidebarTop = sidebar.getBoundingClientRect().top;
                const offset = elTop - sidebarTop + sidebar.scrollTop - 80;
                sidebar.scrollTo({ top: offset, behavior: "smooth" });
                // Flash highlight animation
                el.style.transition = "box-shadow 0.2s ease, outline 0.2s ease";
                el.style.outline = "2px solid #2E8B45";
                el.style.boxShadow = "0 0 0 4px rgba(31,138,62,0.18)";
                el.style.borderRadius = "6px";
                // Focus first input inside the element
                setTimeout(() => {
                  const input = el.querySelector("input, textarea") as HTMLElement | null;
                  input?.focus();
                }, 100);
                // Remove highlight after 1.8s
                setTimeout(() => {
                  el.style.outline = "";
                  el.style.boxShadow = "";
                }, 1800);
              } else if (sidebar) {
                sidebar.scrollTo({ top: 0, behavior: "smooth" });
              }
            }, 160);
          }}
        />
        </div>
      </div>

      {/* ══ MODALS ══ */}
      <AnimatePresence>
        {showPaywall && <PaywallModal action={paywallAction} cost={paywallCost} remaining={credits} onClose={() => setShowPaywall(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCreditDrawer && (
          <CreditHistoryDrawer history={creditHistory} credits={credits} max={planMax} isUnlimited={isUnlimited} plan={plan}
            onClose={() => setShowCreditDrawer(false)} onUpgrade={() => window.location.href="/pricing"} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {creditToast && (
          <CreditUsageToast action={creditToast.action} cost={creditToast.cost} remaining={creditToast.remaining}
            max={creditToast.max} isUnlimited={creditToast.isUnlimited} onDone={() => setCreditToast(null)} />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html:`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }
        input[type="range"] { appearance: none; -webkit-appearance: none; height: 4px; border-radius: 4px; outline: none; cursor: pointer; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${T.accent}; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 6px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        button { font-family: inherit; }
        textarea { font-family: inherit; }
        input { font-family: inherit; }
        body > footer, footer[class], nav[class], header[class*="site"], header[class*="nav"],
        [data-footer], [id="footer"], [id="site-footer"], [class*="site-footer"],
        [class*="Footer"], [class*="SiteFooter"], [class*="GlobalFooter"] { display: none !important; }
        html, body { overflow: hidden !important; height: 100% !important; margin: 0 !important; padding: 0 !important; }
      `}} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════════════════════ */
function EntPanelHeader({ activeTab }: { activeTab: TabId }) {
  const map: Record<TabId, { title: string; sub: string }> = {
    edit:  { title:"Your content",    sub:"Everything that goes on the page" },
    ai:    { title:"Tailor to a job", sub:"Paste a job post and AI rewrites your resume for it" },
    style: { title:"Design",          sub:"Template, fonts and spacing" },
    ats:   { title:"ATS check",       sub:"See which keywords from the job are missing" },
  };
  const { title, sub } = map[activeTab];
  return (
    <div>
      <div style={{ fontSize:17, fontWeight:700, color:T.textPrimary }}>{title}</div>
      <div style={{ fontSize:13, color:T.textTertiary, marginTop:2 }}>{sub}</div>
    </div>
  );
}

function EntSectionContent({ title, icon, action, children }: { title:React.ReactNode; icon:React.ReactNode; action?:React.ReactNode; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:T.textPrimary }}>{icon} {title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function AddButton({ onClick, label, small=false }: { onClick:()=>void; label:string; color?:string; small?:boolean }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", padding:small?"8px 0":"11px 0", marginTop:small?8:12,
        borderRadius:T.radius, border:`1px dashed ${T.borderStrong}`,
        background:"transparent", color:T.textSecondary,
        fontSize:small?12:13.5, fontWeight:600, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s" }}
      onMouseEnter={e=>{(e.currentTarget as any).style.borderColor=T.accent;(e.currentTarget as any).style.color=T.accent;(e.currentTarget as any).style.background=T.accentLight;}}
      onMouseLeave={e=>{(e.currentTarget as any).style.borderColor=T.borderStrong;(e.currentTarget as any).style.color=T.textSecondary;(e.currentTarget as any).style.background="transparent";}}>
      <Plus size={small?13:15} /> {label}
    </button>
  );
}
