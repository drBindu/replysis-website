// app/real-interview/_hooks/useInterview.ts

import { useState, useRef, useCallback, useEffect } from "react";
import { SpeechmaticsClient }  from "../_lib/stt-client";
import { auth }                from "../../firebaseConfig";
import { buildMessages }       from "../_lib/promptBuilder";
import { cleanAnswer, formatForReading } from "../_lib/formatAnswer";
import { cleanResumeForPrompt } from "../../lib/prompt-text";
import type { InterviewMode } from "../_lib/interviewMode";
import type { AnswerStyle } from "../_lib/settings";
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

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
/**
 * Wording for a failed answer. The refund sentence is only added when the API
 * actually reported `creditsRefunded`, because a request that never completed
 * tells us nothing about whether the charge stood.
 */
function failedAnswerMessage(creditsRefunded: boolean): string {
  return creditsRefunded
    ? "We could not generate an answer this time. No credits were used. Press Space to try again."
    : "We could not generate an answer this time. Press Space to try again.";
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function useInterview(config: {
  resume:          string;
  jobDescription:  string;
  companyName:     string;
  role:            string;
  interviewMode:   InterviewMode;
  answerStyle?:     AnswerStyle;
  customInstructions?: string;
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
  // True from the moment listening is asked for until it is stopped. startMic waits for the sign-in token before it
  // makes the client, so a second Space press (or a held Space key repeating) in that gap used to start a second
  // client: two microphones, the same words twice in the transcript, listening minutes counted twice, and the first
  // client could no longer be stopped because nothing pointed at it.
  const listeningRef      = useRef(false);

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
    listeningRef.current = false;
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
      const reply = "That sounds like a really exciting challenge. I've been following what you're building and I have a lot of thoughts on how I can contribute.";
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
    const cleanResume = cleanResumeForPrompt(config.resume);
    const cleanJd     = cleanResumeForPrompt(config.jobDescription);

    try {
      // Get Firebase ID token for authenticated API call
      let authToken = "";
      try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch (e) { console.warn("[Replysis] Could not read sign-in token:", (e as Error)?.name ?? "Error"); }

      // Pass history WITHOUT the just-added interviewer turn  - 
      // buildMessages() receives it separately as `currentQuestion`.
      const messages = buildMessages(
        cleanResume,
        fullText,
        historyRef.current.slice(0, -1),
        config.interviewMode,
        config.answerStyle ?? "balanced",
        config.customInstructions ?? "",
      );

      const requestBody = JSON.stringify({
          mode:       "realtime",
          messages,
          transcript: fullText,
          resume:     cleanResume,
          jd:         cleanJd,
          userEmail:  config.userEmail,
          model:      config.model || "openai/gpt-oss-20b",
          context:    `Interview mode: ${config.interviewMode} | Answer style: ${config.answerStyle ?? "balanced"} | Role: ${config.role} | Company: ${config.companyName}`,
      });
      const sendRequest = async () => {
        const response = await fetch("/api/stt/tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: requestBody,
          signal: AbortSignal.timeout(35000),
        });
        const body = await response.json().catch(() => ({} as any));
        return { response, body };
      };

      let { response: res, body: data } = await sendRequest();

      // Retry only when the server confirms no credit was retained, or when
      // rate limiting happened before charging. Never retry an ambiguous
      // network failure, because that could duplicate a paid request.
      const safelyRetryable = res.status === 429 || (res.status >= 500 && data?.creditsRefunded === true);
      if (safelyRetryable) {
        const retryAfter = Number(res.headers.get("Retry-After") || "1");
        setAnswer("Retrying once…");
        await wait(Math.min(3000, Math.max(500, retryAfter * 1000)));
        ({ response: res, body: data } = await sendRequest());
      }

      // Out of credits is the one failure the user can act on.
      if (res.status === 402 || data?.error === "insufficient_credits") {
        setAnswer("You have used your available credits. Choose a plan to continue.");
        return;
      }

      // Anything else non-2xx is a failure, not an answer. Falling through here
      // used to turn an HTTP 500 into the literal answer "No response." and
      // commit it to history as something the candidate had said.
      if (!res.ok) {
        console.error(`[Replysis] Answer request failed status=${res.status}`);
        setAnswer(failedAnswerMessage(data?.creditsRefunded === true));
        return;
      }

      // A 200 with no usable answer is still a failure; do not invent one.
      const rawAnswer = typeof data?.answer === "string" ? data.answer.trim() : "";
      if (!rawAnswer) {
        console.error("[Replysis] Answer request returned no answer text");
        setAnswer(failedAnswerMessage(data?.creditsRefunded === true));
        return;
      }

      const cleaned = formatForReading(cleanAnswer(rawAnswer));
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
      // The request never completed, so nothing is known about the charge.
      console.error("[Replysis] Answer generation failed:", (err as Error)?.name ?? "Error");
      setAnswer(!navigator.onLine
        ? "That answer did not come through. Press Space to try again."
        : failedAnswerMessage(false));
    } finally {
      // In `finally` on purpose: the failure paths above return early, and a
      // missed reset here leaves the generating guard stuck on, which silently
      // blocks every later question for the rest of the interview.
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [config]);

  // ── START MIC ──────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    // Get Firebase ID token before starting so STT token endpoint can verify auth
    let authToken = "";
    try { authToken = (await auth.currentUser?.getIdToken()) ?? ""; } catch {}
    // Stopped while the token was being read: start nothing.
    if (!listeningRef.current) return;

    setIsRecording(true);
    setTranscript("");
    setPartial("");
    setAnswer("");
    transcriptRef.current = "";
    partialRef.current    = "";

    const client = new SpeechmaticsClient();
    sttClient.current = client;
    await client.start({
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
        // Only the live client may end listening; a late error from one already replaced must not orphan the new one.
        if (sttClient.current !== client) return;
        listeningRef.current = false;
        setIsRecording(false);
        setMicStatus(msg || "Mic error: press Space to retry");
        sttClient.current = null;
      },
    });
  }, [config.language, config.maxDelay, config.operatingPoint]);

  // Always release the microphone, worklet and socket when the interview view
  // is closed or refreshed.
  useEffect(() => () => {
    listeningRef.current = false;
    sttClient.current?.stop();
    sttClient.current = null;
  }, []);

  // ── STOP MIC ───────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    listeningRef.current = false;
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
    // A held Space key repeats about 30 times a second; only the first press counts.
    if (e.repeat) return;
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
