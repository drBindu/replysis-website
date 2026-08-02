// app/real-interview/_hooks/useInterview.ts

import { useState, useRef, useCallback, useEffect } from "react";
import { SpeechmaticsClient }  from "../_lib/stt-client";
import { auth }                from "../../firebaseConfig";
import { buildMessages }       from "../_lib/promptBuilder";
import { cleanAnswer, formatForReading } from "../_lib/formatAnswer";
import {
  isGreeting, isSmallTalk, isGreetingPlusSmallTalk,
  isNoisyGreeting, isCompanyPitch,
  getGreetingResponse, getSmallTalkResponse,
  extractAndLockFacts, clearSessionState,
} from "../_lib/promptBuilder";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type Turn = { role: "interviewer" | "candidate"; text: string };

// ─────────────────────────────────────────────
// SANITIZE RESUME
// ─────────────────────────────────────────────
function sanitizeResume(text: string): string {
  if (!text) return "";
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[- - ]/g, "-")
    .replace(/•/g, "•")
    .replace(/ /g, " ")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n\r\t•]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useInterview(config: {
  resume:          string;
  jobDescription:  string;
  companyName:     string;
  role:            string;
  userEmail:       string;
  model?:          string;
  maxDelay?:       number;
  operatingPoint?: "enhanced" | "standard";
  language?:       string;
}) {
  const [isRecording,  setIsRecording]  = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript,   setTranscript]   = useState("");
  const [partial,      setPartial]      = useState("");
  const [answer,       setAnswer]       = useState("");
  const [history,      setHistory]      = useState<Turn[]>([]);
  const [sessionSecs,  setSessionSecs]  = useState(0);
  const [micStatus,    setMicStatus]    = useState("Ready");

  const sttClient         = useRef<SpeechmaticsClient | null>(null);
  const transcriptRef     = useRef("");
  const partialRef        = useRef("");
  const historyRef        = useRef<Turn[]>([]);
  const timerRef          = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);   // when this recording segment started
  const accumulatedRef    = useRef<number>(0);   // total seconds before current segment
  const isGeneratingRef   = useRef(false);       // race-condition guard

  // Keep historyRef in sync
  useEffect(() => { historyRef.current = history; }, [history]);

  // ── SESSION TIMER ──────────────────────────────────────────────
  // Tracks elapsed time correctly even when recording is toggled:
  // • recordingStartRef: wall-clock ms when this segment started
  // • accumulatedRef:    total seconds from all previous segments
  // Together they give: elapsed = accumulated + (now - segmentStart)
  useEffect(() => {
    if (isRecording) {
      recordingStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const segmentSecs = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        setSessionSecs(accumulatedRef.current + segmentSecs);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        // Persist elapsed time from this segment before stopping
        if (recordingStartRef.current) {
          accumulatedRef.current += Math.floor(
            (Date.now() - recordingStartRef.current) / 1000
          );
        }
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // ── GENERATE ANSWER ────────────────────────────────────────────
  const generateAnswer = useCallback(async () => {
    const fullText = (transcriptRef.current + " " + partialRef.current).trim();
    if (!fullText || isGeneratingRef.current) return;

    // Stop mic first
    if (sttClient.current) {
      sttClient.current.stop();
      sttClient.current = null;
    }
    setIsRecording(false);

    // ── ZERO-LATENCY LOCAL REPLIES ──────────────────────────────
    // Handle greetings and noise instantly without API call.
    // NOTE: isGeneratingRef is NOT set to true on these paths  - 
    //       no cleanup needed.
    if (isGreeting(fullText) || isNoisyGreeting(fullText)) {
      const reply = getGreetingResponse();
      setAnswer(reply);
      extractAndLockFacts(fullText, reply);
      const nextHistory: Turn[] = [
        ...historyRef.current,
        { role: "interviewer", text: fullText },
        { role: "candidate",   text: reply    },
      ];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      return;
    }

    if (isSmallTalk(fullText) || isGreetingPlusSmallTalk(fullText)) {
      const reply = getSmallTalkResponse();
      setAnswer(reply);
      extractAndLockFacts(fullText, reply);
      const nextHistory: Turn[] = [
        ...historyRef.current,
        { role: "interviewer", text: fullText },
        { role: "candidate",   text: reply    },
      ];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      return;
    }

    if (isCompanyPitch(fullText)) {
      const reply = "That sounds like a really exciting challenge  -  I've been following what you're building and I have a lot of thoughts on how I can contribute.";
      setAnswer(reply);
      extractAndLockFacts(fullText, reply);
      const nextHistory: Turn[] = [
        ...historyRef.current,
        { role: "interviewer", text: fullText },
        { role: "candidate",   text: reply    },
      ];
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      return;
    }

    // ── NORMAL AI ANSWER ────────────────────────────────────────
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setAnswer("");

    // Add interviewer turn to history
    const nextHistory: Turn[] = [
      ...historyRef.current,
      { role: "interviewer", text: fullText },
    ];
    setHistory(nextHistory);
    historyRef.current = nextHistory;

    // Clean resume before sending
    const cleanResume = sanitizeResume(config.resume);
    const cleanJd     = sanitizeResume(config.jobDescription);

    try {
      // Get Firebase ID token for authenticated API call
      let authToken = "";
      try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch (e) { console.warn("getIdToken failed:", e); }

      // Pass history WITHOUT the just-added interviewer turn  - 
      // buildMessages() receives it separately as `currentQuestion`.
      const messages = buildMessages(
        cleanResume,
        fullText,
        historyRef.current.slice(0, -1)
      );

      const res = await fetch("/api/stt/tokens", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          messages,
          transcript: fullText,
          resume:     cleanResume,
          jd:         cleanJd,
          userEmail:  config.userEmail,
          model:      config.model || "llama-3.1-8b-instant",
          context:    `Role: ${config.role} | Company: ${config.companyName}`,
        }),
        signal: AbortSignal.timeout(35000),
      });

      const data = await res.json();

      // BUG FIX: reset isGeneratingRef BEFORE any early returns so the
      // guard is never left stuck at `true` after partial-error paths.
      if (res.status === 402 || data.error === "insufficient_credits") {
        isGeneratingRef.current = false;
        setIsGenerating(false);
        setAnswer("⚠️ You've used all your credits. Please upgrade your plan at /pricing.");
        return;
      }

      const cleaned = formatForReading(cleanAnswer(data?.answer || "No response."));
      setAnswer(cleaned);

      // Lock facts from this Q&A so conflict detection works on next question
      extractAndLockFacts(fullText, cleaned);

      const withAnswer: Turn[] = [
        ...historyRef.current,
        { role: "candidate", text: cleaned },
      ];
      setHistory(withAnswer);
      historyRef.current = withAnswer;

    } catch (err) {
      console.error("Answer generation error:", err);
      setAnswer("Error generating answer. Please try again.");
    }

    // Always reached unless the function already returned above
    isGeneratingRef.current = false;
    setIsGenerating(false);
  }, [config]);

  // ── START MIC ──────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    // Get Firebase ID token before starting so STT token endpoint can verify auth
    let authToken = "";
    try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}

    setIsRecording(true);
    setTranscript("");
    setPartial("");
    setAnswer("");
    transcriptRef.current = "";
    partialRef.current    = "";

    sttClient.current = new SpeechmaticsClient();
    sttClient.current.start({
      authToken,
      maxDelay:       config.maxDelay       ?? 0.3,
      operatingPoint: config.operatingPoint || "enhanced",
      onStatus:  (s) => setMicStatus(s),
      onPartial: (text) => {
        partialRef.current = text;
        setPartial(text);
      },
      onFinal: (text) => {
        const clean = text.trim();
        if (!clean) return;
        const current = transcriptRef.current.trim();
        if (current.endsWith(clean)) {
          setPartial(""); partialRef.current = ""; return;
        }
        const next = current ? `${current} ${clean}` : clean;
        setTranscript(next);
        transcriptRef.current = next;
        setPartial(""); partialRef.current = "";
      },
      onError: (msg?: string) => {
        setIsRecording(false);
        setMicStatus(msg || "Mic error: press Space to retry");
        sttClient.current = null;
      },
    });
  }, [config.language, config.maxDelay, config.operatingPoint]);

  // ── STOP MIC ───────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    if (sttClient.current) {
      sttClient.current.stop();
      sttClient.current = null;
    }
    setIsRecording(false);
  }, []);

  // ── TOGGLE ─────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (isRecording) stopMic();
    else startMic();
  }, [isRecording, startMic, stopMic]);

  // ── CLEAR ──────────────────────────────────────────────────────
  const clear = useCallback(() => {
    setTranscript(""); setPartial(""); setAnswer("");
    transcriptRef.current = ""; partialRef.current = "";
  }, []);

  // ── RESET SESSION ──────────────────────────────────────────────
  const resetSession = useCallback(() => {
    stopMic();
    setHistory([]); historyRef.current = [];
    setSessionSecs(0);
    accumulatedRef.current = 0;
    recordingStartRef.current = 0;
    clearSessionState(); // clear locked facts for a fresh session
    clear();
  }, [stopMic, clear]);

  // ── SPACEBAR ───────────────────────────────────────────────────
  const handleSpacebar = useCallback((e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    if (e.target instanceof HTMLInputElement)   return;
    if (e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    if (isGenerating) return; // never interrupt while AI is thinking
    if (isRecording) {
      generateAnswer(); // stop mic + generate
    } else if (!answer && (transcriptRef.current.trim() || partialRef.current.trim())) {
      // Mic stopped due to error but no answer yet  -  still generate from what we got
      generateAnswer();
    } else {
      // Either fresh start OR answer already shown → listen for next question
      startMic();
    }
  }, [isRecording, isGenerating, answer, generateAnswer, startMic]);

  return {
    isRecording, isGenerating,
    transcript, partial,
    answer, history,
    sessionSecs, micStatus,
    toggleMic, startMic, stopMic,
    generateAnswer, clear, resetSession,
    handleSpacebar,
  };
}
