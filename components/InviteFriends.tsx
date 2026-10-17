"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useAuth } from "./AuthProvider";

type Invite = { code: string; link: string; rewarded: number; max: number; rewardAnswers: number };

/**
 * "Invite a friend": the person's own link, and how many friends have joined through it. The reward is added on the
 * server when the friend signs up, so this card only shows the link and the count.
 */
export default function InviteFriends() {
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/referral", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok && !cancelled) setInvite((await res.json()) as Invite);
      } catch { /* the card simply stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user || !invite) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* the link is also selectable in the box */ }
  };

  return (
    <section id="invite-friends"
      className="scroll-mt-24 rounded-[26px] border border-emerald-900/10 bg-white p-6 shadow-[0_12px_40px_rgba(20,60,34,0.06)] sm:p-8">
      <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Invite a friend</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        When a friend signs up with your link, you each get {invite.rewardAnswers} free answers. It works for up to {invite.max} friends.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={invite.link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your invite link"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C7A3E] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#176533]"
        >
          {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy link</>}
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">
        {invite.rewarded === 0
          ? "No friends have joined yet."
          : `${invite.rewarded} ${invite.rewarded === 1 ? "friend has" : "friends have"} joined through your link.`}
      </p>
    </section>
  );
}
