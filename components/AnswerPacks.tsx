"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { CREDIT_PACKS, type CreditPackId } from "../data/creditPacks";
import { answersLabel } from "../data/productFacts";

/**
 * "Add more answers": the one-time packs, for anyone who needs a little more without a
 * subscription.
 *
 * They are not on the pricing page (owner, 2026-09-29). Three plan cards and three packs side by
 * side made Pro look like the worse deal and confused the choice. They appear where someone has
 * just run out (the low-answers notice, the app), and here, in the account. Free, Pro and Max
 * see the same thing, and so does India, in rupees.
 *
 * A pack is a one-off payment: no renewal, added to the balance after Stripe confirms it, and
 * used after the monthly answers. It is shown in answers, never credits.
 */
export default function AnswerPacks() {
  const { user } = useAuth();
  const [rupees, setRupees] = useState(false);
  const [loading, setLoading] = useState<CreditPackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rupee prices are shown only where the server says the rupee price exists in Stripe, so this can
  // never display a number the checkout will not charge. What is charged is decided again there.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.country === "IN" && d?.rupeePacks) setRupees(true); })
      .catch(() => { /* dollars, the safe default */ });
    return () => { cancelled = true; };
  }, []);

  // A link to /account#add-answers should land here even though this renders after sign in.
  useEffect(() => {
    if (!user || typeof window === "undefined" || window.location.hash !== "#add-answers") return;
    const timer = window.setTimeout(() => document.getElementById("add-answers")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => window.clearTimeout(timer);
  }, [user]);

  const buy = async (id: CreditPackId) => {
    if (!user || loading) return;
    setLoading(id);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creditPack: id, uid: user.uid }),
      });
      const data = await response.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      console.error("[Replysis] Answer pack checkout could not start:", response.status);
      setError(response.status === 429
        ? "Too many attempts. Please wait a moment and try again."
        : "We could not start checkout. You have not been charged. Please try again.");
    } catch (err) {
      console.error("[Replysis] Answer pack checkout request failed:", (err as Error)?.name ?? "Error");
      setError("We could not reach checkout. Check your connection. You have not been charged.");
    }
    setLoading(null);
  };

  if (!user) return null;

  return (
    <section id="add-answers" className="scroll-mt-24 rounded-[26px] border border-emerald-900/10 bg-white p-6 shadow-[0_12px_40px_rgba(20,60,34,0.06)] sm:p-8">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#267b42]">Need a little more?</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Add more answers</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        One payment, no subscription, no renewal. The answers are added to your balance after payment
        is confirmed, and are used after your monthly answers.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <div key={pack.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#267b42]">{pack.label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{answersLabel(pack.credits)}</p>
            <p className="mt-1 text-lg font-black text-slate-700">{rupees ? `₹${pack.inr}` : `$${pack.price}`}</p>
            <button
              type="button"
              onClick={() => buy(pack.id)}
              disabled={Boolean(loading)}
              className="mt-4 w-full rounded-xl bg-[#1C7A3E] py-2.5 text-sm font-black text-white transition hover:bg-[#176533] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading === pack.id ? (
                <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirecting</span>
              ) : "Add these answers"}
            </button>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}
