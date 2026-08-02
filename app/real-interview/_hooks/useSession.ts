// app/real-interview/_hooks/useSession.ts
// All session I/O goes through /api/sessions (Firebase Admin SDK on the server),
// so Firestore client security rules never block saves or reads.
//
// Auth: every request sends the current user's Firebase ID token as
// Authorization: Bearer <token>.  The server verifies it and rejects
// calls that don't match the requested email.

import { useState, useRef, useCallback } from "react";
import { auth } from "../../firebaseConfig";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type Turn = {
  role: "interviewer" | "candidate";
  text: string;
};

export type Session = {
  id:            string;
  createdAt:     any;           // raw from API  -  use formatDate() to display
  companyName:   string;
  role:          string;
  resumeSnippet: string;
  turns:         Turn[];
  questionCount: number;
  durationSecs:  number;
  _createdAtSeconds?: number;  // pre-computed for sorting
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Returns a fresh Firebase ID token, or empty string if not signed in.
// Always call this immediately before a fetch  -  tokens expire after 1 hour
// but Firebase auto-refreshes them so getIdToken() returns a valid one.
async function getAuthToken(): Promise<string> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? "";
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useSession(userEmail: string) {
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Current live session's Firestore document ID.
  // null = no session created yet (first Q&A will create one).
  const sessionDocId = useRef<string | null>(null);

  // ── UPSERT SESSION ────────────────────────────────────────────────────────
  // Creates a Firestore doc on the first call, then updates it on subsequent
  // calls  -  same behaviour as the Windows native app writing to a .txt file
  // after every Q&A exchange.
  const upsertSession = useCallback(async (payload: {
    companyName:   string;
    role:          string;
    resume:        string;
    turns:         Turn[];
    durationSecs:  number;
  }) => {
    if (!userEmail || !payload.turns || payload.turns.length === 0) return;

    try {
      const token = await getAuthToken();

      const res = await fetch("/api/sessions", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          userEmail,
          sessionId:    sessionDocId.current,   // null = create, string = update
          companyName:  payload.companyName  || "Unknown",
          role:         payload.role         || "Unknown",
          resume:       payload.resume       || "",
          turns:        payload.turns,
          durationSecs: payload.durationSecs || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[session] Save failed:", data.error);
        return;
      }

      // Store the doc ID so future calls update rather than create
      if (data.sessionId && !sessionDocId.current) {
        sessionDocId.current = data.sessionId;
        console.log("[session] Created →", data.sessionId);
      }
    } catch (err) {
      console.error("[session] upsertSession error:", err);
    }
  }, [userEmail]);

  // ── SAVE SESSION (kept for endSession compat) ─────────────────────────────
  const saveSession = useCallback(async (payload: {
    companyName:   string;
    role:          string;
    resume:        string;
    turns:         Turn[];
    durationSecs:  number;
  }) => {
    if (!userEmail || !payload.turns || payload.turns.length === 0) return;
    setSaving(true);
    await upsertSession(payload);
    setSaving(false);
  }, [userEmail, upsertSession]);

  // ── RESET SESSION ID ──────────────────────────────────────────────────────
  // Call when starting a new session so the next upsertSession creates a
  // fresh Firestore document instead of appending to the previous one.
  const resetSessionId = useCallback(() => {
    sessionDocId.current = null;
  }, []);

  // ── LOAD SESSIONS ─────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setLoadError(null);

    try {
      const token = await getAuthToken();

      const res = await fetch(
        `/api/sessions?email=${encodeURIComponent(userEmail)}`,
        {
          headers: { "Authorization": `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data.error || "Failed to load sessions.");
        setLoading(false);
        return;
      }

      const docs: Session[] = (data.sessions || []).map((d: any) => ({
        id:                 d.id,
        createdAt:          d.createdAt,
        _createdAtSeconds:  d._createdAtSeconds ?? 0,
        companyName:        d.companyName   || "Unknown",
        role:               d.role          || "Unknown",
        resumeSnippet:      d.resumeSnippet || "",
        turns:              d.turns         || [],
        questionCount:      d.questionCount || 0,
        durationSecs:       d.durationSecs  || 0,
      }));

      setSessions(docs);
    } catch (err: any) {
      console.error("[session] loadSessions error:", err);
      setLoadError("Could not load sessions. Check your connection and try again.");
    }

    setLoading(false);
  }, [userEmail]);

  // ── FORMAT DATE ───────────────────────────────────────────────────────────
  // Handles both Admin SDK timestamps ({ _seconds }) and client SDK Timestamps
  const formatDate = (ts: any): string => {
    if (!ts) return " - ";
    try {
      let date: Date;
      if (typeof ts._seconds === "number")      date = new Date(ts._seconds * 1000);
      else if (typeof ts.seconds === "number")  date = new Date(ts.seconds  * 1000);
      else if (ts.toDate)                       date = ts.toDate();
      else                                      date = new Date(ts);
      return date.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return " - "; }
  };

  // ── FORMAT DURATION ───────────────────────────────────────────────────────
  const formatDuration = (secs: number): string => {
    const safe = Math.floor(secs ?? 0);
    if (!safe || Number.isNaN(safe)) return "0:00";
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return {
    sessions,
    loading,
    saving,
    loadError,
    saveSession,
    upsertSession,
    resetSessionId,
    loadSessions,
    formatDate,
    formatDuration,
  };
}
