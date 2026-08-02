"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud, Search, Loader2,
  CheckCircle2, AlertCircle, FileText, Zap,
} from "lucide-react";

type Config = {
  resume:         string;
  jobDescription: string;
  companyName:    string;
  role:           string;
};

type Props = {
  onStart:     (config: Config) => void;
  onDashboard: () => void;
};

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true,
    }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ") + "\n";
    }
    return text.trim();
  } catch (err) {
    throw new Error("Could not read PDF");
  }
}

function cleanText(text: string): string {
  return text
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[- - ]/g, "-").replace(/•/g, "•")
    .replace(/ /g, " ").replace(/[^\x20-\x7E\n\r\t•]/g, "")
    .replace(/\n{3,}/g, "\n\n").trim();
}

export default function SetupForm({ onStart, onDashboard }: Props) {
  const [cfg, setCfg] = useState<Config>({ resume: "", jobDescription: "", companyName: "", role: "" });
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyResult, setVerifyResult] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof Config, val: string) => {
    setCfg(c => ({ ...c, [key]: val }));
    if (key === "resume") { setVerified(false); setVerifyResult(""); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name); setUploadError(""); setUploading(true); setVerified(false); setVerifyResult("");
    try {
      let text = "";
      const name = f.name.toLowerCase();
      if (f.type === "application/pdf" || name.endsWith(".pdf")) {
        try {
          text = await extractPdfText(f);
          if (!text || text.length < 30) {
            setUploadError("This PDF appears to be a scanned image. Please use the Paste tab instead.");
            setUploading(false); return;
          }
        } catch {
          setUploadError("Could not read this PDF. Please paste your resume text in the Paste tab.");
          setUploading(false); return;
        }
      } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
        // .doc/.docx are binary Office formats  -  f.text() returns garbled data.
        setUploadError("Word documents (.doc/.docx) cannot be read directly. Please save as PDF or paste the text in the Paste tab.");
        setUploading(false); return;
      } else {
        // Plain text (.txt)  -  safe to read as UTF-8
        text = await f.text();
      }
      const cleaned = cleanText(text);
      if (cleaned.length < 50) {
        setUploadError("Not enough text found. Please paste your resume instead.");
        setUploading(false); return;
      }
      update("resume", cleaned);
    } catch { setUploadError("Failed to read file. Please paste your resume text instead."); }
    setUploading(false);
  };

  const verifyResume = async () => {
    if (!cfg.resume || cfg.resume.length < 50) return;
    setVerifying(true); setVerifyResult("");
    try {
      const res = await fetch("/api/stt/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "verify_resume", resume: cfg.resume }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      setVerifyResult(data.summary || "Verified.");
      setVerified(true);
    } catch { setVerifyResult("Verification failed. Please try again."); }
    setVerifying(false);
  };

  const hasResume = cfg.resume.trim().length > 50;

  return (
    <div className="space-y-5">

      {/* Company + Role */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "companyName" as const, label: "Company",  placeholder: "e.g. Google, Amazon…"      },
          { key: "role"        as const, label: "Role",     placeholder: "e.g. Software Engineer"    },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              {label} <span className="text-slate-400 normal-case font-normal tracking-normal">(optional)</span>
            </label>
            <input
              value={cfg[key]}
              onChange={e => update(key, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
            />
          </div>
        ))}
      </div>

      {/* Job Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
          Job Description <span className="text-slate-400 normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <textarea
          value={cfg.jobDescription}
          onChange={e => update("jobDescription", e.target.value)}
          placeholder="Paste the job description for more tailored answers…"
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none placeholder:text-slate-300"
        />
      </div>

      {/* Resume */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Resume <span className="text-slate-400 normal-case font-normal tracking-normal">(optional, better answers with it)</span>
            </label>
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-lg">
            {(["paste", "upload"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setUploadError(""); }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  tab === t ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}>
                {t === "paste" ? "✏️ Paste" : "📎 Upload"}
              </button>
            ))}
          </div>
        </div>

        {tab === "paste" && (
          <textarea
            value={cfg.resume}
            onChange={e => update("resume", e.target.value)}
            placeholder="Paste your full resume text here… (optional. AI gives more generic answers without it)"
            rows={8}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-mono leading-relaxed outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none placeholder:text-slate-300"
          />
        )}

        {tab === "upload" && (
          <div>
            <motion.div
              onClick={() => !uploading && fileRef.current?.click()}
              whileTap={{ scale: uploading ? 1 : 0.98 }}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all min-h-[160px] flex flex-col items-center justify-center gap-3 cursor-pointer ${
                uploading       ? "border-indigo-300 bg-indigo-50" :
                uploadError     ? "border-red-300 bg-red-50 hover:border-red-400" :
                cfg.resume && fileName ? "border-emerald-300 bg-emerald-50 hover:border-emerald-400" :
                                  "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50"
              }`}
            >
              <input ref={fileRef} type="file" className="hidden" accept=".txt,.pdf" onChange={handleFile} />
              {uploading ? (
                <><Loader2 size={28} className="text-indigo-500 animate-spin" />
                  <p className="text-indigo-600 font-semibold text-sm">Reading PDF…</p></>
              ) : uploadError ? (
                <><AlertCircle size={28} className="text-red-400" />
                  <p className="text-red-600 font-semibold text-sm text-center max-w-xs leading-relaxed">{uploadError}</p>
                  <p className="text-red-400 text-xs">Click to try again</p></>
              ) : cfg.resume && fileName ? (
                <><CheckCircle2 size={28} className="text-emerald-500" />
                  <p className="text-emerald-600 font-semibold text-sm">{fileName}</p>
                  <p className="text-emerald-500 text-xs">{cfg.resume.length.toLocaleString()} characters extracted</p></>
              ) : (
                <><UploadCloud size={28} className="text-slate-400" />
                  <div className="text-center">
                    <p className="text-slate-600 font-semibold text-sm mb-1">Click to upload resume</p>
                    <p className="text-slate-400 text-xs">PDF or TXT · For Word docs, save as PDF first</p>
                  </div></>
              )}
            </motion.div>
          </div>
        )}

        {/* Verify */}
        {hasResume && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button onClick={verifyResume} disabled={verifying}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
              {verifying ? <Loader2 size={14} className="animate-spin" /> : verified ? <CheckCircle2 size={14} /> : <Search size={14} />}
              {verifying ? "Verifying…" : verified ? "Resume verified ✓" : "Verify AI reads your resume correctly"}
            </button>
            {verifyResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Resume Scan:</p>
                <pre className="text-xs text-emerald-800 leading-relaxed whitespace-pre-wrap break-words font-mono">{verifyResult}</pre>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Start button  -  always enabled */}
      <motion.button
        whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}
        onClick={() => onStart(cfg)}
        className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
      >
        <Zap size={18} />
        Start Interview Session
        {!hasResume && <span className="text-indigo-200 text-sm font-normal ml-1">(no resume, generic mode)</span>}
      </motion.button>

      {!hasResume && (
        <p className="text-center text-xs text-slate-400">
          💡 Add your resume for answers tailored to your experience
        </p>
      )}
    </div>
  );
}
