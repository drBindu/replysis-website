"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MASTER_RESUME } from "../../data/masterResume";
import mammoth from "mammoth";
import { auth } from "../firebaseConfig";
import {
  TEMPLATE_LIST, buildPrintHTML, getTemplateThumbnail,
  type TemplateId,
} from "./components/templates";
import {
  Sparkles, Download, RotateCcw, User, Palette, Save, FileText,
  Plus, Trash2, Award, Briefcase, GraduationCap, Code, Wrench,
  ChevronUp, ChevronDown, GripVertical, Layers, Link as LinkIcon,
  Loader2, Zap, Target, BarChart3,
  CheckCircle2, Wand2, Home,
  BrainCircuit,
  PanelLeftClose, PanelLeftOpen, Keyboard, Coins, AlignLeft,
  AlertCircle, ChevronRight,
  Crown, X, TrendingUp,
} from "lucide-react";
import { useCredits } from "../lib/use-credits";
import { PLAN_CONFIG } from "../lib/credits";
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
  summary:        { label: "Summary",        Icon: FileText,      color: "#2E8B45", bg: "rgba(31,138,62,0.08)"  },
  skills:         { label: "Skills",         Icon: Wrench,        color: "#d97706", bg: "rgba(217,119,6,0.08)"   },
  experience:     { label: "Experience",     Icon: Briefcase,     color: "#1C7A3E", bg: "rgba(37,99,235,0.08)"   },
  projects:       { label: "Projects",       Icon: Code,          color: "#21924A", bg: "rgba(31,138,62,0.08)"  },
  education:      { label: "Education",      Icon: GraduationCap, color: "#21924A", bg: "rgba(31,138,62,0.08)"   },
  certifications: { label: "Certifications", Icon: Award,         color: "#21924A", bg: "rgba(31,138,62,0.08)"  },
};

const AI_PROVIDERS: {
  id: AiProvider; label: string; model: string;
  color: string; light: string; icon: string; desc: string;
}[] = [
  { id: "openai", label: "OpenAI", model: "GPT-4o",    color: "#10a37f", light: "rgba(16,163,127,0.10)", icon: "✦", desc: "Best quality" },
  { id: "gemini", label: "Gemini", model: "2.0 Flash", color: "#4285f4", light: "rgba(66,133,244,0.10)", icon: "✧", desc: "Fast & smart" },
  { id: "groq",   label: "Groq",   model: "Llama 3.3", color: "#f55036", light: "rgba(245,80,54,0.10)",  icon: "⚡", desc: "Ultra fast"  },
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

const COLORS = [
  "#1e40af","#1C7A3E","#21924A","#0d9488","#21924A","#1C7A3E",
  "#854d0e","#dc2626","#be123c","#db2777","#c026d3","#2E8B45",
  "#21924A","#1C7A3E","#475569","#1e293b","#000000",
];

const PAPER: Record<string, { w: number; h: number; label: string }> = {
  a4:     { w: 794, h: 1123, label: "A4"     },
  letter: { w: 816, h: 1056, label: "Letter" },
};

/* ════════════════════════════════════════════════════════════════
   THEME
════════════════════════════════════════════════════════════════ */
const T = {
  bg:           "#f8f7f5",
  bgPanel:      "#ffffff",
  bgHeader:     "#ffffff",
  border:       "#e8e4df",
  borderStrong: "#d4cfc9",
  textPrimary:  "#1a1714",
  textSecondary:"#6b6460",
  textTertiary: "#a09893",
  accent:       "#2d5be3",
  accentHover:  "#2148c7",
  accentLight:  "rgba(45,91,227,0.08)",
  success:      "#1C7A3E",
  successLight: "rgba(21,128,61,0.08)",
  warning:      "#d97706",
  warningLight: "rgba(217,119,6,0.08)",
  danger:       "#dc2626",
  dangerLight:  "rgba(220,38,38,0.08)",
  purple:       "#21924A",
  purpleLight:  "rgba(31,138,62,0.08)",
  shadow:       "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:     "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg:     "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)",
  radius:       "8px",
  radiusMd:     "10px",
  radiusLg:     "14px",
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
function scanATS(resumeData: any, jdText: string) {
  if (!jdText.trim()) return { score: 0, found: [], missing: [], total: 0 };
  const resumeFlat = JSON.stringify(resumeData).toLowerCase();
  const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","can","shall","this","that","these","those","i","you","we","they","he","she","it","my","your","our","their","his","her","its","me","us","them","who","which","what","where","when","how","why","not","no","all","each","every","both","few","more","most","other","some","such","than","too","very","just","about","above","after","again","also","as","because","before","between","during","into","through","under","until","up","over","out","if","so","then","here","there","only","own","same","while","any","new","now","way","well","work","years","experience","role","team","company","using","etc","per","via","including","across","within","strong","ability","looking","join","responsible","requirements","qualifications","preferred","required","minimum","plus","knowledge","understanding","familiarity"]);
  const jdWords = jdText.toLowerCase().replace(/[^a-z0-9\s+#.]/g, " ").split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  const freq: Record<string, number> = {};
  jdWords.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([w]) => w);
  const unique = [...new Set(keywords)];
  const found   = unique.filter(k => resumeFlat.includes(k));
  const missing = unique.filter(k => !resumeFlat.includes(k));
  const score   = unique.length > 0 ? Math.round((found.length / unique.length) * 100) : 0;
  return { score, found, missing, total: unique.length };
}

/* ════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
════════════════════════════════════════════════════════════════ */
const Inp = ({ value, onChange, placeholder = "", type = "text" }: any) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width:"100%", background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:T.radius,
      padding:"7px 10px", fontSize:13, color:T.textPrimary, outline:"none", transition:"all 0.15s", fontFamily:"inherit" }}
    onFocus={e => { e.target.style.borderColor=T.accent; e.target.style.boxShadow=`0 0 0 3px ${T.accentLight}`; }}
    onBlur={e  => { e.target.style.borderColor=T.border; e.target.style.boxShadow="none"; }}
  />
);

const Textarea = ({ value, onChange, placeholder = "", rows = 3 }: any) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ width:"100%", background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:T.radius,
      padding:"8px 10px", fontSize:13, color:T.textPrimary, outline:"none", transition:"all 0.15s",
      resize:"vertical", lineHeight:1.6, fontFamily:"inherit" }}
    onFocus={e => { (e.target as any).style.borderColor=T.accent; (e.target as any).style.boxShadow=`0 0 0 3px ${T.accentLight}`; }}
    onBlur={e  => { (e.target as any).style.borderColor=T.border;  (e.target as any).style.boxShadow="none"; }}
  />
);

const Label = ({ children }: any) => (
  <div style={{ fontSize:10, color:T.textTertiary, fontWeight:700, textTransform:"uppercase",
    letterSpacing:"0.1em", marginBottom:5 }}>{children}</div>
);

const SectionCard = ({ children }: any) => (
  <div style={{ background:T.bgPanel, border:`1.5px solid ${T.border}`, borderRadius:T.radiusMd,
    padding:14, marginBottom:10, boxShadow:T.shadow }}>{children}</div>
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
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:9, fontWeight:800,
    padding:"2px 7px", borderRadius:20, letterSpacing:"0.08em", textTransform:"uppercase",
    background:"linear-gradient(135deg, #f59e0b, #d97706)", color:"#fff",
    boxShadow:"0 1px 6px rgba(245,158,11,0.3)" }}>
    <Crown size={8} /> Pro
  </span>
);

/* ════════════════════════════════════════════════════════════════
   AI PROVIDER SELECTOR
════════════════════════════════════════════════════════════════ */
function AiProviderSelector({ value, onChange }: { value: AiProvider; onChange: (p: AiProvider) => void }) {
  const active = AI_PROVIDERS.find(p => p.id === value)!;
  return (
    <div style={{ marginBottom:16 }}>
      <Label>AI Provider</Label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8 }}>
        {AI_PROVIDERS.map(p => {
          const isActive = value === p.id;
          return (
            <button key={p.id} onClick={() => onChange(p.id)}
              style={{ padding:"10px 4px", borderRadius:T.radiusMd,
                border:`1.5px solid ${isActive ? p.color : T.border}`,
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
        background: active.light, border:`1.5px solid ${active.color}30`,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:14 }}>{active.icon}</span>
        <div>
          <span style={{ fontSize:11, fontWeight:700, color: active.color }}>{active.label} {active.model}</span>
          <span style={{ fontSize:11, color:T.textSecondary }}> · {active.desc}</span>
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
        border:`1.5px solid ${T.border}`, borderRadius:T.radiusMd, padding:"12px 16px",
        boxShadow:T.shadowLg, display:"flex", alignItems:"center", gap:12, minWidth:280 }}>
      <div style={{ width:36, height:36, borderRadius:T.radius, flexShrink:0,
        background:isUnlimited ? T.purpleLight : T.accentLight,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {isUnlimited ? <Crown size={16} style={{ color:T.purple }} /> : <Coins size={16} style={{ color:T.accent }} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.textPrimary, marginBottom:2 }}>
          {isUnlimited ? "Plan credits active" : `-${cost} credits used`}
        </div>
        <div style={{ fontSize:11, color:T.textSecondary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {action} {isUnlimited ? "✓" : `· ${remaining} remaining`}
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
function CreditMeter({ credits=0, max=100, isUnlimited=false, plan="free", onOpenHistory }: {
  credits?: number; max?: number; isUnlimited?: boolean; plan?: string; onOpenHistory?: () => void;
}) {
  const pct   = isUnlimited ? 100 : Math.min(100, Math.round((credits/max)*100));
  const color = isUnlimited ? T.purple : pct>50 ? T.success : pct>20 ? T.warning : T.danger;
  const label = isUnlimited ? "Monthly plan credits" : `${credits} / ${max} credits remaining`;
  return (
    <Tooltip tip={`${label} · Click to see usage`} side="bottom">
      <button onClick={onOpenHistory}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:T.radiusMd,
          background:T.bg, border:`1.5px solid ${T.border}`, cursor:"pointer", transition:"all 0.15s" }}
        onMouseEnter={e=>(e.currentTarget as any).style.borderColor=T.borderStrong}
        onMouseLeave={e=>(e.currentTarget as any).style.borderColor=T.border}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {isUnlimited ? <Crown size={13} style={{ color:T.purple }} /> : <Coins size={13} style={{ color }} />}
          <span style={{ fontSize:12, fontWeight:800, color, fontVariantNumeric:"tabular-nums" }}>
            {isUnlimited ? "∞" : credits}
          </span>
        </div>
        {!isUnlimited && (
          <div style={{ width:48, height:4, borderRadius:3, background:T.border, overflow:"hidden" }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8 }}
              style={{ height:"100%", borderRadius:3, background:color }} />
          </div>
        )}
        <span style={{ fontSize:9, fontWeight:800, color:T.textTertiary, textTransform:"uppercase", letterSpacing:"0.08em" }}>
          {isUnlimited ? "Pro" : plan}
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
        style={{ width:340, height:"100vh", background:T.bgPanel, borderLeft:`1.5px solid ${T.border}`,
          display:"flex", flexDirection:"column", boxShadow:"-8px 0 32px rgba(0,0,0,0.1)" }}>
        <div style={{ padding:"18px 20px 14px", borderBottom:`1.5px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:T.radius, background:T.accentLight,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <TrendingUp size={16} style={{ color:T.accent }} />
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>Credit Usage</div>
                <div style={{ fontSize:10, color:T.textTertiary }}>This session</div>
              </div>
            </div>
            <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:T.textTertiary, padding:4 }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:T.radiusMd,
            background:isUnlimited?T.purpleLight:T.bg, border:`1.5px solid ${isUnlimited?T.purple+"30":T.border}` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:T.textTertiary, fontWeight:600, marginBottom:2 }}>Current Balance</div>
                <div style={{ fontSize:28, fontWeight:900, color:barColor, lineHeight:1 }}>
                  {isUnlimited ? "∞" : credits}
                  {!isUnlimited && <span style={{ fontSize:13, fontWeight:600, color:T.textTertiary }}> / {max}</span>}
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
        <div style={{ padding:"14px 20px", borderBottom:`1.5px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.textTertiary, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Credit Costs</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {[
              { label:"AI Tailor Resume",    cost:20, icon:"✦", color:T.accent  },
              { label:"AI Rewrite Bullet",   cost:5,  icon:"✧", color:T.purple  },
              { label:"AI Generate Summary", cost:5,  icon:"✧", color:T.purple  },
              { label:"Resume Analysis",     cost:10, icon:"◈", color:T.warning },
              { label:"ATS Scan",            cost:0,  icon:"◎", color:T.success },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"7px 10px", borderRadius:T.radius, background:T.bg }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14, color:item.color }}>{item.icon}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:T.textSecondary }}>{item.label}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:800, color:item.cost===0?T.success:T.textPrimary }}>
                  {item.cost===0 ? "Free" : `${item.cost} cr`}
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
                    borderRadius:T.radiusMd, background:T.bg, border:`1.5px solid ${T.border}` }}>
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
          <div style={{ padding:"14px 20px", borderTop:`1.5px solid ${T.border}`, flexShrink:0 }}>
            <button onClick={onUpgrade}
              style={{ width:"100%", padding:"11px 0", borderRadius:T.radiusMd, border:"none",
                background:`linear-gradient(135deg, ${T.accent}, ${T.purple})`,
                color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow:"0 4px 14px rgba(45,91,227,0.3)" }}>
              <Crown size={15} /> Upgrade for more monthly credits
            </button>
            <p style={{ fontSize:10, color:T.textTertiary, textAlign:"center", marginTop:8 }}>Pro includes 2,000 credits refreshed monthly</p>
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
          border:`1.5px solid ${T.border}`, boxShadow:T.shadowLg, textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:T.dangerLight,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Coins size={24} style={{ color:T.danger }} />
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:T.textPrimary, marginBottom:8 }}>Not enough credits</div>
        <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.6, marginBottom:6 }}>
          <strong>{action}</strong> costs <strong>{cost} credits</strong>.
        </p>
        <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.6, marginBottom:24 }}>
          You have <strong style={{ color:T.danger }}>{remaining} credits</strong> remaining.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"10px 0", borderRadius:T.radiusMd, border:`1.5px solid ${T.border}`,
              background:T.bg, color:T.textSecondary, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={() => window.location.href="/pricing"}
            style={{ flex:2, padding:"10px 0", borderRadius:T.radiusMd, border:"none",
              background:`linear-gradient(135deg, ${T.accent}, ${T.purple})`,
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
          border:`1.5px solid ${T.border}`, boxShadow:T.shadowLg }}>
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
  const [aiProvider,   setAiProvider]   = useState<AiProvider>("openai");

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
  const DEFAULT_SIDEBAR_WIDTH = 300;
  const MIN_SIDEBAR_WIDTH = 300;
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
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext==="txt") { setResumeData({ ...MASTER_RESUME, summary: await file.text() }); }
      else if (ext==="docx"||ext==="doc") {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        if (result.value?.trim()) setResumeData({ ...MASTER_RESUME, summary: result.value });
        else notifyFailure("upload");
      } else if (ext==="pdf") {
        const buf = await file.arrayBuffer();
        const pdfjsLib = await loadPdfJs();
        const pdf = await pdfjsLib.getDocument({ data:buf, useSystemFonts:true, disableFontFace:true }).promise;
        let text = "";
        for (let i=1; i<=pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item:any) => item.str).join(" ") + "\n";
        }
        if (text.trim()) setResumeData({ ...MASTER_RESUME, summary: text });
        else notifyFailure("upload");
      } else { notifyFailure("upload"); }
    } catch { notifyFailure("upload"); }
    e.target.value = "";
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
      setShowDiff(true); setActiveTab("edit");
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
  useEffect(() => { if (activeTab==="ats" && jd) runATS(); }, [activeTab]);

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
      const r = await fetch(`${API_BASE}/api/v1/resume/save`, {
        method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${saveToken}`},
        body: JSON.stringify({ fullName:resumeData.personalInfo?.name, headline:resumeData.personalInfo?.headline, email:resumeData.personalInfo?.email, phone:resumeData.personalInfo?.phone, summary:resumeData.summary, skills:JSON.stringify(resumeData.skillCategories||[]), experience:JSON.stringify(resumeData.experience||[]), projects:JSON.stringify(resumeData.projects||[]), accentColor:ac, fontSize:fs }),
      });
      setSaveStatus(r.ok ? "saved" : "error");
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
      <header style={{ height:52, flexShrink:0, background:T.bgHeader, borderBottom:`1.5px solid ${T.border}`,
        display:"flex", alignItems:"center", paddingLeft:16, paddingRight:20,
        boxShadow:"0 1px 0 rgba(0,0,0,0.04)", zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <a href="/" style={{ display:"flex", alignItems:"center", justifyContent:"center",
            width:32, height:32, borderRadius:T.radius, background:T.bg, border:`1.5px solid ${T.border}`,
            color:T.textSecondary, textDecoration:"none", transition:"all 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as any).style.borderColor=T.borderStrong}
            onMouseLeave={e=>(e.currentTarget as any).style.borderColor=T.border}>
            <Home size={14} />
          </a>
          <ChevronRight size={12} style={{ color:T.textTertiary }} />
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 10px", borderRadius:T.radius, background:T.accentLight }}>
            <div style={{ width:22, height:22, borderRadius:6, background:T.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FileText size={11} style={{ color:"#fff" }} />
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:T.accent }}>Resume Builder</span>
            <ProBadge />
          </div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.textTertiary }}>Profile completeness</div>
            <div style={{ width:120, height:5, borderRadius:3, background:T.border, overflow:"hidden" }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${Math.round((completedSections/totalSections)*100)}%` }} transition={{ duration:0.6, ease:"easeOut" }}
                style={{ height:"100%", borderRadius:3, background:completedSections===totalSections?`linear-gradient(90deg,${T.success},#22c55e)`:`linear-gradient(90deg,${T.accent},#2E8B45)` }} />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:T.textPrimary }}>{completedSections}/{totalSections}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:T.bg, border:`1px solid ${T.border}` }}>
            <AlignLeft size={11} style={{ color:T.textTertiary }} />
            <WordCountBadge text={JSON.stringify(resumeData)} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:T.bg, border:`1px solid ${T.border}` }}>
            <span style={{ fontSize:11 }}>{AI_PROVIDERS.find(p=>p.id===aiProvider)?.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:T.textSecondary }}>{AI_PROVIDERS.find(p=>p.id===aiProvider)?.label}</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <CreditMeter credits={credits} max={planMax} isUnlimited={isUnlimited} plan={plan} onOpenHistory={() => setShowCreditDrawer(true)} />
          <div style={{ width:1, height:24, background:T.border, margin:"0 4px" }} />
          <Tooltip tip="Keyboard shortcuts (⌘/)" side="bottom">
            <button onClick={() => setShowShortcuts(true)}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:T.radius,
                border:`1.5px solid ${T.border}`, background:"none", cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
              onMouseEnter={e=>{(e.currentTarget as any).style.background=T.bg;(e.currentTarget as any).style.color=T.textPrimary;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.background="none";(e.currentTarget as any).style.color=T.textTertiary;}}>
              <Keyboard size={14} />
            </button>
          </Tooltip>
          <Tooltip tip="Save (⌘S)" side="bottom">
            <button onClick={handleSave}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"0 14px", height:32, borderRadius:T.radius,
                border:"none", cursor:"pointer", fontSize:12, fontWeight:700, transition:"all 0.15s",
                background:saveStatus==="saved"?T.success:saveStatus==="saving"?T.accent:saveStatus==="error"?T.danger:T.bg,
                color:saveStatus!=="idle"?"#fff":T.textSecondary,
                boxShadow:saveStatus!=="idle"?T.shadow:"none",
                outline:`1.5px solid ${saveStatus==="idle"?T.border:"transparent"}` }}>
              {saveStatus==="saving" ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} /> : <Save size={13} />}
              <span>{saveStatus==="saved"?"Saved!":saveStatus==="error"?"Error":"Save"}</span>
            </button>
          </Tooltip>

          {/* ══ EXPORT PDF BUTTON ══ */}
          <Tooltip tip="Export PDF (⌘P)" side="bottom">
            <button onClick={handleExportPDF} disabled={isPrinting}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"0 14px", height:32, borderRadius:T.radius,
                border:"none", cursor:isPrinting?"wait":"pointer", fontSize:12, fontWeight:700, transition:"all 0.15s",
                background:isPrinting?T.accentLight:T.accent, color:isPrinting?T.accent:"#fff",
                boxShadow:isPrinting?"none":"0 2px 8px rgba(45,91,227,0.3)", opacity:isPrinting?0.7:1 }}>
              {isPrinting ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} /> : <Download size={13} />}
              <span>{isPrinting?"Exporting…":"Export PDF"}</span>
            </button>
          </Tooltip>

          {/* ══ EXPORT WORD BUTTON ══ */}
          <Tooltip tip="Export Word (.docx)" side="bottom">
            <button onClick={handleExportWord} disabled={isExportingWord}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"0 14px", height:32, borderRadius:T.radius,
                border:`1.5px solid ${T.border}`, cursor:isExportingWord?"wait":"pointer",
                fontSize:12, fontWeight:700, transition:"all 0.15s",
                background:isExportingWord?T.bg:T.bgPanel,
                color:isExportingWord?T.textTertiary:T.textSecondary,
                opacity:isExportingWord?0.7:1 }}>
              {isExportingWord ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} /> : <FileText size={13} />}
              <span>{isExportingWord?"Exporting…":"Word"}</span>
            </button>
          </Tooltip>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ══ LEFT RAIL ══ */}
        <nav style={{ width:64, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center",
          paddingTop:16, paddingBottom:16, gap:4, borderRight:`1.5px solid ${T.border}`, background:T.bgPanel, zIndex:20 }}>
          <Tooltip tip={sidebarCollapsed?"Expand sidebar (⌘B)":"Collapse sidebar (⌘B)"} side="right">
            <button onClick={() => setSidebarCollapsed(c => !c)}
              style={{ width:36, height:36, borderRadius:T.radius, border:`1.5px solid ${T.border}`,
                background:sidebarCollapsed?T.accentLight:T.bg, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:sidebarCollapsed?T.accent:T.textTertiary, transition:"all 0.15s", marginBottom:8 }}>
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </Tooltip>
          <div style={{ width:"100%", padding:"0 8px", display:"flex", flexDirection:"column", gap:3 }}>
            {([
              { id:"edit"  as TabId, icon:User,        label:"Edit",  tip:"Edit Resume (⌘1)",   badge:null },
              { id:"ai"    as TabId, icon:BrainCircuit, label:"AI",    tip:"AI Engine (⌘2)",     badge:"new" },
              { id:"style" as TabId, icon:Palette,      label:"Style", tip:"Design Studio (⌘3)", badge:null },
              { id:"ats"   as TabId, icon:Target,       label:"ATS",   tip:"ATS Scanner (⌘4)",   badge:atsResult?String(atsResult.score+"%"):null },
            ] as const).map(t => {
              const active = activeTab === t.id;
              return (
                <Tooltip key={t.id} tip={t.tip} side="right">
                  <button onClick={() => setActiveTab(t.id)}
                    style={{ position:"relative", width:"100%", display:"flex", flexDirection:"column",
                      alignItems:"center", gap:3, padding:"8px 0", borderRadius:T.radius,
                      border:`1.5px solid ${active?T.accentLight:"transparent"}`,
                      background:active?T.accentLight:"none", cursor:"pointer", transition:"all 0.15s",
                      color:active?T.accent:T.textTertiary }}>
                    {active && (
                      <motion.div layoutId="rail-indicator"
                        style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                          width:3, height:22, borderRadius:"0 3px 3px 0", background:T.accent }} />
                    )}
                    <t.icon size={16} />
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.05em" }}>{t.label}</span>
                    {t.badge && (
                      <div style={{ position:"absolute", top:4, right:4, padding:"1px 5px", borderRadius:8,
                        fontSize:8, fontWeight:800, letterSpacing:"0.05em",
                        background:t.badge==="new"?T.accent:T.success, color:"#fff" }}>
                        {t.badge}
                      </div>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <div style={{ marginTop:"auto", width:"100%", padding:"0 8px", display:"flex", flexDirection:"column", gap:3 }}>
            <Tooltip tip="Credit usage" side="right">
              <button onClick={() => setShowCreditDrawer(true)}
                style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  padding:"7px 0", borderRadius:T.radius, border:"none", background:"none",
                  cursor:"pointer", color:T.textTertiary, fontSize:9, fontWeight:700, transition:"all 0.15s" }}
                onMouseEnter={e=>{(e.currentTarget as any).style.color=T.accent;(e.currentTarget as any).style.background=T.accentLight;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.background="none";}}>
                <Coins size={14} /><span>Credits</span>
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
              initial={{ width:0, opacity:0 }} animate={{ width:sidebarWidth, opacity:1 }} exit={{ width:0, opacity:0 }}
              transition={{ duration:0.22, ease:"easeInOut" }}
              style={{ flexShrink:0, borderRight:`1.5px solid ${T.border}`, overflow:"hidden",
                display:"flex", flexDirection:"column", background:T.bgPanel,
                minWidth:MIN_SIDEBAR_WIDTH, maxWidth:MAX_SIDEBAR_WIDTH }}>
              <div style={{ padding:"14px 18px 12px", borderBottom:`1.5px solid ${T.border}`, flexShrink:0 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:6 }} transition={{ duration:0.13 }}>
                    <EntPanelHeader activeTab={activeTab} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div id="editor-sidebar" style={{ flex:1, padding:14, overflowY:"auto" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }} transition={{ duration:0.16 }}>

                    {/* ══ EDIT TAB ══ */}
                    {activeTab === "edit" && (
                      <>
                        <div style={{ padding:"10px 12px", borderRadius:T.radiusMd, background:T.bg, border:`1.5px solid ${T.border}`, marginBottom:14 }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:T.textSecondary }}>Section completion</span>
                            <span style={{ fontSize:11, fontWeight:800, color:T.accent }}>{Math.round((completedSections/totalSections)*100)}%</span>
                          </div>
                          <div style={{ width:"100%", height:5, borderRadius:3, background:T.border, overflow:"hidden" }}>
                            <motion.div animate={{ width:`${Math.round((completedSections/totalSections)*100)}%` }} transition={{ duration:0.5 }}
                              style={{ height:"100%", borderRadius:3, background:completedSections===totalSections?T.success:T.accent }} />
                          </div>
                        </div>
                        <div style={{ fontSize:10, color:T.textTertiary, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8, paddingLeft:2 }}>Content Sections</div>

                        {/* ══ ACCORDION NAV ══ */}
                        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                          {[
                            { id:"personal",       label:"Personal Info",  Icon:User,        color:T.accent,        bg:T.accentLight },
                            ...sectionOrder.map(id => ({ id, ...SECTION_META[id] })),
                            ...customSections.map(cs => ({ id:cs.id, label:cs.title, Icon:Plus, color:"#A04E2C", bg:"rgba(33,146,74,0.08)" })),
                            { id:"order",          label:"Section Order",  Icon:Layers,      color:T.textSecondary, bg:"rgba(107,100,96,0.07)" },
                          ].map(item => {
                            const active = editSection === item.id;
                            const done   = (item.id !== "order" && !item.id.startsWith("custom_")) ? sectionComplete(item.id as any) : true;
                            return (
                              <div key={item.id} style={{ marginBottom: active ? 6 : 2 }}>
                                {/* ── Section header button ── */}
                                <button
                                  onClick={() => setEditSection(active ? "" : item.id)}
                                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 10px",
                                    borderRadius: active ? `${T.radius} ${T.radius} 0 0` : T.radius,
                                    cursor:"pointer",
                                    border:`1.5px solid ${active ? item.color+"40" : "transparent"}`,
                                    borderBottom: active ? "none" : `1.5px solid transparent`,
                                    background:active ? item.bg : "none",
                                    color:active ? item.color : T.textSecondary,
                                    fontSize:12, fontWeight:600, transition:"all 0.15s", textAlign:"left" }}
                                  onMouseEnter={e=>{if(!active){(e.currentTarget as any).style.background=item.bg;(e.currentTarget as any).style.color=item.color;}}}
                                  onMouseLeave={e=>{if(!active){(e.currentTarget as any).style.background="none";(e.currentTarget as any).style.color=T.textSecondary;}}}>
                                  <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                                    background:active ? item.color+"20" : T.bg,
                                    border:`1px solid ${active ? item.color+"40" : T.border}` }}>
                                    <item.Icon size={13} style={{ color:item.color }} />
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
                                        border:`1.5px solid ${item.color}40`,
                                        borderTop:"none",
                                        borderRadius:`0 0 ${T.radius} ${T.radius}`,
                                        background:T.bgPanel }}>
                                      <div style={{ padding:"14px 12px 12px" }}>

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
                                                      style={{ width:"35%", background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:T.radius, padding:"7px 9px", fontSize:12, color:T.textPrimary, outline:"none" }} />
                                                    <input value={link.url||""} onChange={e=>updateCustomLink(i,"url",e.target.value)} placeholder="https://..."
                                                      style={{ flex:1, background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:T.radius, padding:"7px 9px", fontSize:12, color:T.textPrimary, outline:"none" }} />
                                                    <button onClick={()=>removeCustomLink(i)} style={{ padding:6, border:"none", background:"none", cursor:"pointer", color:T.textTertiary }}
                                                      onMouseEnter={e=>(e.currentTarget as any).style.color=T.danger} onMouseLeave={e=>(e.currentTarget as any).style.color=T.textTertiary}>
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                              <AddButton onClick={addCustomLink} label="Add Link" color={T.accent} />
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
                                                  border:`1.5px solid ${T.accent}30`, background:T.accentLight, color:T.accent,
                                                  fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s", opacity:loading?0.5:1 }}>
                                                {loading&&aiAction==="summary" ? <Loader2 size={11} style={{ animation:"spin 1s linear infinite" }} /> : <Wand2 size={11} />}
                                                AI Generate
                                              </button>
                                            </div>
                                            <div id="field-summary"><Textarea value={resumeData.summary||""} onChange={(e:any)=>set(d=>({...d,summary:e.target.value}))} rows={8} placeholder="Professional summary..." /></div>
                                            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:6 }}>
                                              <Coins size={10} style={{ color:T.textTertiary }} />
                                              <p style={{ fontSize:10, color:T.textTertiary, margin:0 }}>AI Generate uses <strong>5 credits</strong></p>
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
                                                          <Tooltip tip="AI rewrite (5 credits)" side="right">
                                                            <button onClick={()=>handleRewriteBullet("experience",i,bi)} disabled={rewritingBullet===`experience-${i}-${bi}`}
                                                              style={{ padding:5, border:`1.5px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                              onMouseEnter={e=>{(e.currentTarget as any).style.color=T.purple;(e.currentTarget as any).style.borderColor=T.purple+"50";}}
                                                              onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                              {rewritingBullet===`experience-${i}-${bi}` ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                                                            </button>
                                                          </Tooltip>
                                                          <button onClick={()=>removeBullet("experience",i,bi)}
                                                            style={{ padding:5, border:`1.5px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                            onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.borderColor=T.danger+"40";}}
                                                            onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                            <Trash2 size={12} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  <AddButton onClick={()=>addBullet("experience",i)} label="Add Bullet" color="#1C7A3E" small />
                                                </SectionCard></div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addExperience} label="Add Experience" color="#1C7A3E" />
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
                                                          <Tooltip tip="AI rewrite (5 credits)" side="right">
                                                            <button onClick={()=>handleRewriteBullet("projects",i,bi)} disabled={rewritingBullet===`projects-${i}-${bi}`}
                                                              style={{ padding:5, border:`1.5px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                              onMouseEnter={e=>{(e.currentTarget as any).style.color=T.purple;(e.currentTarget as any).style.borderColor=T.purple+"50";}}
                                                              onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                              {rewritingBullet===`projects-${i}-${bi}` ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                                                            </button>
                                                          </Tooltip>
                                                          <button onClick={()=>removeBullet("projects",i,bi)}
                                                            style={{ padding:5, border:`1.5px solid ${T.border}`, borderRadius:6, background:T.bg, cursor:"pointer", color:T.textTertiary, transition:"all 0.15s" }}
                                                            onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.borderColor=T.danger+"40";}}
                                                            onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                            <Trash2 size={12} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  <AddButton onClick={()=>addBullet("projects",i)} label="Add Bullet" color={T.purple} small />
                                                </SectionCard></div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addProject} label="Add Project" color={T.purple} />
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
                                            <AddButton onClick={addEducation} label="Add Education" color={T.success} />
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
                                            <AddButton onClick={addSkillCategory} label="Add Category" color={T.warning} />
                                          </>
                                        )}

                                        {/* CERTIFICATIONS */}
                                        {item.id === "certifications" && (
                                          <>
                                            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                                              {(resumeData.certifications||[]).map((c:any,i:number)=>(
                                                <div key={i} style={{ display:"flex", gap:5 }}>
                                                  <Inp value={typeof c==="string"?c:c?.name||""} onChange={(e:any)=>updateCertification(i,e.target.value)} placeholder="AWS Certified - Amazon (2024)" />
                                                  <button onClick={()=>removeCertification(i)} style={{ padding:6, border:`1.5px solid ${T.border}`, borderRadius:T.radius, background:T.bg, cursor:"pointer", color:T.textTertiary, flexShrink:0, transition:"all 0.15s" }}
                                                    onMouseEnter={e=>{(e.currentTarget as any).style.color=T.danger;(e.currentTarget as any).style.borderColor=T.danger+"40";}}
                                                    onMouseLeave={e=>{(e.currentTarget as any).style.color=T.textTertiary;(e.currentTarget as any).style.borderColor=T.border;}}>
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                            <AddButton onClick={addCertification} label="Add Certification" color="#21924A" />
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
                                                    color:T.textPrimary, fontFamily:"inherit", borderBottom:`1.5px solid #A04E2C40`, paddingBottom:2 }} />
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
                                              <AddButton onClick={()=>addCustomSectionItem(cs.id)} label="Add Entry" color="#A04E2C" />
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
                                                    background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:T.radiusMd }}>
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
                            borderRadius:T.radius, cursor:"pointer", border:`1.5px dashed #A04E2C40`,
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
                              background:T.dangerLight, border:`1.5px solid ${T.danger}25`,
                              display:"flex", alignItems:"center", gap:10 }}>
                            <AlertCircle size={14} style={{ color:T.danger, flexShrink:0 }} />
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:T.danger }}>Low on credits</div>
                              <div style={{ fontSize:10, color:T.textSecondary }}>{credits} credits left. Tailor costs 20.</div>
                            </div>
                            <button onClick={() => window.location.href="/pricing"}
                              style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:T.radius, border:"none",
                                background:T.danger, color:"#fff", fontSize:10, fontWeight:800, cursor:"pointer", flexShrink:0 }}>
                              Upgrade
                            </button>
                          </motion.div>
                        )}
                        <AiProviderSelector value={aiProvider} onChange={setAiProvider} />
                        <div style={{ padding:14, borderRadius:T.radiusMd, marginBottom:16,
                          background:"linear-gradient(135deg,rgba(45,91,227,0.06),rgba(31,138,62,0.06))",
                          border:`1.5px solid ${T.accent}20` }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:T.radius, background:T.accentLight,
                              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <Zap size={14} style={{ color:T.accent }} />
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary, marginBottom:3 }}>AI Resume Tailoring</div>
                              <p style={{ fontSize:11, color:T.textSecondary, lineHeight:1.55 }}>
                                Paste a job description or just keywords (e.g. "Java backend") and AI will tailor your resume accordingly.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                          <Label>Job Description or Keywords</Label>
                          <WordCountBadge text={jd} />
                        </div>
                        <Textarea value={jd} onChange={(e:any)=>setJd(e.target.value)}
                          placeholder="Paste a full JD or just type keywords like 'Java backend microservices'…" rows={12} />
                        <div style={{ marginTop:10, marginBottom:12, padding:"8px 12px", borderRadius:T.radiusMd,
                          background:T.bg, border:`1.5px solid ${T.border}`,
                          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Coins size={12} style={{ color:T.accent }} />
                            <span style={{ fontSize:11, fontWeight:600, color:T.textSecondary }}>AI Tailor costs</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:13, fontWeight:800, color:T.accent }}>20 credits</span>
                            <span style={{ fontSize:10, color:T.textTertiary }}>· {isUnlimited?"∞ remaining":`${credits} remaining`}</span>
                          </div>
                        </div>
                        <button onClick={handleTailor} disabled={loading||!jd}
                          style={{ width:"100%", padding:"12px 0", borderRadius:T.radiusMd, border:"none",
                            fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                            cursor:loading||!jd?"not-allowed":"pointer", transition:"all 0.15s",
                            background:loading||!jd?T.accentLight:T.accent,
                            color:loading||!jd?T.accent:"#fff",
                            boxShadow:!loading&&jd?"0 3px 12px rgba(45,91,227,0.25)":"none", opacity:!jd?0.5:1 }}>
                          {loading&&aiAction==="tailoring"
                            ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Tailoring your resume…</>
                            : <><Sparkles size={15} /> Tailor Resume to JD</>}
                        </button>
                        {showDiff && prevResume && (
                          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                            style={{ marginTop:14, padding:14, background:T.successLight,
                              border:`1.5px solid ${T.success}25`, borderRadius:T.radiusMd }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                              <CheckCircle2 size={14} style={{ color:T.success }} />
                              <span style={{ fontSize:12, fontWeight:700, color:T.success }}>Resume Tailored!</span>
                            </div>
                            <p style={{ fontSize:11, color:T.textSecondary, lineHeight:1.55, marginBottom:12 }}>Your resume has been rewritten to match the job description.</p>
                            <div style={{ display:"flex", gap:7 }}>
                              <button onClick={()=>{ setResumeData(prevResume); setShowDiff(false); }}
                                style={{ flex:1, padding:"8px 0", borderRadius:T.radius, border:`1.5px solid ${T.danger}30`, background:T.dangerLight, color:T.danger, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                <RotateCcw size={11} /> Undo
                              </button>
                              <button onClick={()=>setShowDiff(false)}
                                style={{ flex:1, padding:"8px 0", borderRadius:T.radius, border:`1.5px solid ${T.success}30`, background:T.successLight, color:T.success, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
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
                                    borderRadius:T.radiusMd, border:`1.5px solid ${isSelected?ac:T.border}`,
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
                            style={{ width:"100%", height:32, background:"none", border:`1.5px solid ${T.border}`, borderRadius:T.radius, cursor:"pointer", padding:2 }} />
                        </div>
                        <div style={{ marginBottom:18 }}>
                          <Label>Font Family</Label>
                          <div style={{ display:"flex", gap:3, marginBottom:8, background:T.bg, borderRadius:T.radius, border:`1.5px solid ${T.border}`, padding:3 }}>
                            {(["all","Serif","Sans","Mono"] as const).map(cat=>(
                              <button key={cat} onClick={()=>setFontFilter(cat)}
                                style={{ flex:1, padding:"5px 0", borderRadius:5, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, transition:"all 0.15s",
                                  background:fontFilter===cat?T.bgPanel:"none", color:fontFilter===cat?T.textPrimary:T.textTertiary, boxShadow:fontFilter===cat?T.shadow:"none" }}>
                                {cat==="all"?"All":cat}
                              </button>
                            ))}
                          </div>
                          <div style={{ maxHeight:160, overflowY:"auto", borderRadius:T.radiusMd, border:`1.5px solid ${T.border}`, background:T.bgPanel }}>
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
                                style={{ padding:"8px 0", borderRadius:T.radius, border:`1.5px solid ${marginPreset===m?T.accent+"50":T.border}`,
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
                                style={{ padding:"8px 0", borderRadius:T.radius, border:`1.5px solid ${paperSize===k?T.accent+"50":T.border}`,
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
                        <div style={{ padding:14, borderRadius:T.radiusMd, marginBottom:16, background:T.warningLight, border:`1.5px solid ${T.warning}25` }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:T.radius, background:T.warningLight,
                              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1.5px solid ${T.warning}30` }}>
                              <BarChart3 size={14} style={{ color:T.warning }} />
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary, marginBottom:3 }}>ATS Keyword Scanner</div>
                              <p style={{ fontSize:11, color:T.textSecondary, lineHeight:1.55 }}>Paste a job description and see how well your resume matches its keywords.</p>
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                          <Label>Job Description</Label>
                          <WordCountBadge text={jd} />
                        </div>
                        <Textarea value={jd} onChange={(e:any)=>setJd(e.target.value)} placeholder="Paste Job Description here…" rows={8} />
                        <button onClick={runATS} disabled={!jd}
                          style={{ width:"100%", marginTop:10, padding:"11px 0", borderRadius:T.radiusMd, border:"none",
                            fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                            cursor:!jd?"not-allowed":"pointer", transition:"all 0.15s", opacity:!jd?0.5:1,
                            background:T.warningLight, color:T.warning, outline:`1.5px solid ${T.warning}30` }}>
                          <BarChart3 size={15} /> Scan Keywords
                        </button>
                        {atsResult && (
                          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} style={{ marginTop:14, display:"flex", flexDirection:"column", gap:12 }}>
                            <div style={{ textAlign:"center", padding:"18px 0", background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:T.radiusMd }}>
                              <div style={{ fontSize:48, fontWeight:900, lineHeight:1, color:atsResult.score>=70?T.success:atsResult.score>=40?T.warning:T.danger }}>
                                {atsResult.score}%
                              </div>
                              <div style={{ fontSize:11, color:T.textTertiary, marginTop:5 }}>ATS Match · {atsResult.found.length}/{atsResult.total} keywords</div>
                              <div style={{ width:"70%", height:5, borderRadius:3, background:T.border, margin:"12px auto 0", overflow:"hidden" }}>
                                <motion.div initial={{ width:0 }} animate={{ width:`${atsResult.score}%` }} transition={{ duration:0.8 }}
                                  style={{ height:"100%", borderRadius:3, background:atsResult.score>=70?T.success:atsResult.score>=40?T.warning:T.danger }} />
                              </div>
                            </div>
                            {atsResult.found.length > 0 && (
                              <div>
                                <div style={{ fontSize:10, color:T.success, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:7 }}>Found ({atsResult.found.length})</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                  {atsResult.found.map((k:string)=>(
                                    <span key={k} style={{ padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:600, background:T.successLight, color:T.success, border:`1px solid ${T.success}25` }}>{k}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {atsResult.missing.length > 0 && (
                              <div>
                                <div style={{ fontSize:10, color:T.danger, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:7 }}>Missing ({atsResult.missing.length})</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                  {atsResult.missing.map((k:string)=>(
                                    <span key={k} style={{ padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:600, background:T.dangerLight, color:T.danger, border:`1px solid ${T.danger}25` }}>{k}</span>
                                  ))}
                                </div>
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
        {!sidebarCollapsed && (
          <div onMouseDown={handleDividerMouseDown} onDoubleClick={handleDividerDoubleClick}
            title="Drag to resize · Double-click to reset"
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
  const map: Record<TabId, { icon: React.ReactNode; title: string; sub: string }> = {
    edit:  { icon:<User size={14} style={{ color:T.accent }} />,        title:"Resume Editor",  sub:"Edit your content"    },
    ai:    { icon:<BrainCircuit size={14} style={{ color:T.purple }} />, title:"AI Engine",      sub:"AI-powered tailoring" },
    style: { icon:<Palette size={14} style={{ color:T.success }} />,    title:"Design Studio",  sub:"Customize your look"  },
    ats:   { icon:<Target size={14} style={{ color:T.warning }} />,      title:"ATS Scanner",    sub:"Match job keywords"   },
  };
  const { icon, title, sub } = map[activeTab];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:32, height:32, borderRadius:T.radius, background:T.bg,
        border:`1.5px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{title}</div>
        <div style={{ fontSize:10, color:T.textTertiary }}>{sub}</div>
      </div>
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

function AddButton({ onClick, label, color, small=false }: { onClick:()=>void; label:string; color:string; small?:boolean }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", padding:small?"6px 0":"9px 0", marginTop:small?6:10,
        borderRadius:T.radius, border:`1.5px dashed ${color}40`,
        background:color+"08", color:color+"cc",
        fontSize:small?10:12, fontWeight:700, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all 0.15s" }}
      onMouseEnter={e=>{(e.currentTarget as any).style.background=color+"14";(e.currentTarget as any).style.borderColor=color+"70";(e.currentTarget as any).style.color=color;}}
      onMouseLeave={e=>{(e.currentTarget as any).style.background=color+"08";(e.currentTarget as any).style.borderColor=color+"40";(e.currentTarget as any).style.color=color+"cc";}}>
      <Plus size={small?11:13} /> {label}
    </button>
  );
}
