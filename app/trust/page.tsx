import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "../../components/PageShell";
import { PUBLIC_PLAN_CAPACITY, TRUST_FACTS } from "../../data/productFacts";

export const metadata: Metadata = {
  title: "Trust Center - Replysis",
  description: "Clear information about Replysis data handling, security controls, AI limitations, screen capture, and plan capacity.",
};

const DATA_FLOW = [
  {
    number: "01",
    title: "Transcribe",
    text: "Live audio streams from your device to Speechmatics for real-time transcription. Replysis does not store the raw audio file on its application servers.",
  },
  {
    number: "02",
    title: "Generate",
    text: "The transcript, resume context, and instructions pass through Replysis to the selected AI provider so it can generate an answer, feedback, or resume suggestion.",
  },
  {
    number: "03",
    title: "Save only when used",
    text: "If saved interview history is used, session turns, company, role, duration, and a short resume snippet are stored in the user's account until deletion.",
  },
];

const CONTROLS = [
  { title: "Authentication", text: "Firebase Authentication and verified server-side identity checks protect account-scoped actions." },
  { title: "Payments", text: "Stripe collects card details. Replysis receives customer and subscription identifiers, not full card numbers or CVVs." },
  { title: "Application safeguards", text: "Sensitive routes use authorization checks, account-ownership checks, input validation, request-size limits, and rate limits." },
  { title: "Transport", text: "The website and API use HTTPS in production. Provider connections use encrypted HTTPS or secure WebSocket transport." },
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#f7faf7] text-[#131a14]">
      <PageHeader />

      <section className="relative overflow-hidden border-b border-[#1f6f3d]/10 bg-white px-6 py-16 md:py-20">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1f6f3d]/15 bg-[#f4faf5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#267b42]">
            Updated August 13, 2026
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.045em] text-gray-950 md:text-6xl">
            Trust should be specific, not implied.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
            This page explains what Replysis processes, what it stores, how screen-capture controls work, and which claims we do not make.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/privacy" className="rounded-full bg-[#1C7A3E] px-5 py-2.5 text-xs font-black text-white hover:bg-[#155f30]">Read Privacy Policy</Link>
            <a href="mailto:support@replysis.com" className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-black text-gray-700 hover:border-[#1C7A3E]">Ask a privacy question</a>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#267b42]">Data flow</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">What happens during a live session</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {DATA_FLOW.map((item) => (
              <article key={item.number} className="rounded-2xl border border-[#1f6f3d]/10 bg-white p-6 shadow-[0_15px_45px_rgba(21,60,34,0.05)]">
                <span className="text-xs font-black tracking-[0.14em] text-[#267b42]">{item.number}</span>
                <h3 className="mt-3 text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#1f6f3d]/10 bg-white px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#267b42]">Screen capture</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Designed for standard paths. Never a universal guarantee.</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{TRUST_FACTS.screenCapture}</p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              Test the exact device, operating system, meeting app, recording mode, and sharing method before an important call. Follow employer and interview-platform rules.
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONTROLS.map((control) => (
              <article key={control.title} className="rounded-2xl border border-gray-100 bg-[#f8faf8] p-5">
                <h3 className="text-sm font-black text-gray-900">{control.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{control.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl bg-[#111b13] p-7 text-white md:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">AI limitations</p>
              <h2 className="mt-3 text-2xl font-black">Suggestions require judgment.</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                Generated answers, resume rewrites, scores, and feedback can be inaccurate or incomplete. Verify names, dates, metrics, technologies, and claims. Never present experience you do not have.
              </p>
            </article>
            <article className="rounded-3xl border border-[#1f6f3d]/10 bg-white p-7 md:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#267b42]">Current assurance status</p>
              <h2 className="mt-3 text-2xl font-black">No unverified compliance badges.</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Replysis does not currently claim SOC 2 certification, a contractual 99.9% uptime SLA, or a completed independent security audit. Those claims will appear only after the required assessment and evidence exist.
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-3xl border border-[#1f6f3d]/10 bg-white p-7 md:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#267b42]">Plan transparency</p>
                <h2 className="mt-2 text-2xl font-black">The public limits match the product limits.</h2>
              </div>
              <Link href="/pricing" className="text-sm font-black text-[#267b42] hover:text-[#155f30]">See pricing →</Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {Object.values(PUBLIC_PLAN_CAPACITY).map((plan) => (
                <div key={plan.label} className="rounded-2xl bg-[#f5f8f5] p-4">
                  <p className="text-sm font-black text-gray-900">{plan.label}</p>
                  <p className="mt-1 text-lg font-black text-[#267b42]">{plan.credits.toLocaleString()} credits</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{plan.example}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
