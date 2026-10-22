"use client";
import React, { useState } from "react";
import { auth } from "../firebaseConfig";

// Update news to every customer. A test goes to the admin first; "Send to everyone" asks once more before it goes.
export default function EmailUsersPanel() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function send(test: boolean) {
    setBusy(true); setNote(null);
    try {
      const token = (await auth.currentUser?.getIdToken()) ?? "";
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "emailUsers", subject, message, test }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setNote({ ok: body.failed === 0,
        text: test ? (body.failed ? `Test failed: ${body.error}` : "Test sent to you. Check your inbox.")
                   : `Sent to ${body.sent} of ${body.recipients} people${body.failed ? `. ${body.failed} failed: ${body.error}` : "."}` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not send" });
    } finally {
      setBusy(false); setConfirming(false);
    }
  }

  const ready = subject.trim().length > 0 && message.trim().length > 0 && !busy;
  return (
    <section className="rounded-xl border border-white/10 bg-[#0e0e15] p-5">
      <h2 className="text-sm font-semibold text-white">Email all users</h2>
      <p className="mt-0.5 text-[12px] text-zinc-500">
        For news like a new version. Every email has an unsubscribe link, and people who unsubscribed are skipped.
        New users get a welcome email on their own.
      </p>
      <div className="mt-3 grid gap-2">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="Subject"
          className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-white/30" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} rows={6}
          placeholder={"Hi,\n\nReplysis 1.0.42 is out. ..."}
          className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-white/30" />
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={!ready} onClick={() => send(true)}
            className="rounded-md border border-white/15 px-3 py-1.5 text-[12px] font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-40">
            Send me a test first
          </button>
          {!confirming ? (
            <button disabled={!ready} onClick={() => setConfirming(true)}
              className="rounded-md bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40">
              Send to everyone
            </button>
          ) : (
            <>
              <span className="text-[12px] text-amber-200">Send this to every user now?</span>
              <button disabled={busy} onClick={() => send(false)}
                className="rounded-md bg-emerald-500/30 px-3 py-1.5 text-[12px] font-semibold text-emerald-100">Yes, send</button>
              <button onClick={() => setConfirming(false)} className="px-2 text-[12px] text-zinc-400">Cancel</button>
            </>
          )}
          {note && <span className={`text-[12px] ${note.ok ? "text-emerald-300" : "text-red-300"}`}>{note.text}</span>}
        </div>
      </div>
    </section>
  );
}
