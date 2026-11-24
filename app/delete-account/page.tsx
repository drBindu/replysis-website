"use client";
// Account deletion on the web. Google Play requires a page outside the app where anyone with an account can ask for it
// to be deleted (2026-11-24). Same request as the phone app's "Delete my account": recorded, the owner is told, and
// the account and its data are deleted within 7 days.
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function DeleteAccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setChecked(true); }), []);

  async function requestDeletion() {
    if (!user) return;
    setBusy(true); setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/account/delete-request", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(String(res.status));
      setDone(true);
      await signOut(auth);
    } catch {
      setError("Your request could not be sent just now. Try again, or email support@replysis.com from your account's address.");
    } finally {
      setBusy(false); setConfirming(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] px-4 py-16 text-[#1F1E1B]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E3DED3] bg-[#FBFAF6] p-8">
        <h1 className="text-[26px] font-semibold">Delete your Replysis account</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#5E5A51]">
          Deleting your account removes your sign-in, your answer balance, your saved interview sessions, your resume and
          your settings. It is done within 7 days of your request and cannot be undone. Payment records that the law
          requires us to keep are kept for that purpose only.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-[#5E5A51]">
          If you have a monthly plan, cancel it first from your account page, so you are not charged again.
        </p>

        <div className="mt-6">
          {done ? (
            <div className="rounded-lg border border-[#BFD6C5] bg-[#EAF2EC] px-4 py-3 text-[15px] text-[#1F5A3F]">
              Request received. Your account will be deleted within 7 days, and you have been signed out.
            </div>
          ) : !checked ? (
            <p className="text-[15px] text-[#7A756A]">Checking your sign-in</p>
          ) : !user ? (
            <a href="/?auth=required&next=/delete-account"
               className="inline-block rounded-lg bg-[#2F6B4F] px-5 py-2.5 text-[15px] font-medium text-[#FBFAF6] hover:bg-[#285C44]">
              Sign in to delete your account
            </a>
          ) : confirming ? (
            <div>
              <p className="text-[15px]">Delete the account <strong>{user.email}</strong>? This cannot be undone.</p>
              <div className="mt-4 flex gap-3">
                <button onClick={requestDeletion} disabled={busy}
                  className="rounded-lg bg-[#A33A2B] px-5 py-2.5 text-[15px] font-medium text-[#FBFAF6] hover:bg-[#8E2F22] disabled:opacity-60">
                  {busy ? "Sending" : "Yes, delete my account"}
                </button>
                <button onClick={() => setConfirming(false)} className="rounded-lg px-5 py-2.5 text-[15px] text-[#5E5A51] hover:bg-[#F1EEE7]">
                  Keep my account
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[15px] text-[#5E5A51]">Signed in as <strong className="text-[#1F1E1B]">{user.email}</strong></p>
              <button onClick={() => setConfirming(true)}
                className="mt-4 rounded-lg border border-[#E7C4BC] bg-[#F7E6E2] px-5 py-2.5 text-[15px] font-medium text-[#8E2F22] hover:bg-[#F0D6D0]">
                Delete my account
              </button>
            </div>
          )}
          {error && <p className="mt-4 text-[14px] text-[#A33A2B]">{error}</p>}
        </div>

        <p className="mt-8 text-[14px] leading-relaxed text-[#7A756A]">
          You can also delete your account in the Replysis phone app under Account, or by emailing support@replysis.com
          from the address you signed up with. Read how your data is handled in our <a href="/privacy" className="underline">privacy policy</a>.
        </p>
      </div>
    </main>
  );
}
