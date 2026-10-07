import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "../../components/PageShell";
import "../home-v2.css";
import { PUBLIC_PLAN_CAPACITY, TRUST_FACTS, answersLabel } from "../../data/productFacts";

export const metadata: Metadata = {
  title: "Trust Center - Replysis",
  description: "Clear information about Replysis data handling, security controls, AI limitations, screen capture, and plan capacity.",
};

const DATA_FLOW = [
  {
    number: "01",
    title: "Transcribe",
    text: "Live audio streams from your device to Deepgram for real-time transcription, with Speechmatics as a backup. Replysis does not store the raw audio file on its application servers. From version 1.0.20 the Windows app keeps an encrypted copy on your own computer for 7 days only if you turn on Save session audio.",
  },
  {
    number: "02",
    title: "Generate",
    text: "The transcript, resume context, and instructions pass through Replysis to the selected AI provider so it can generate an answer, feedback, or resume suggestion. While the desktop app is listening it also sends screenshots of your screen, which Replysis holds for at most 90 seconds before deleting them.",
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
    <main className="marketing hv2 min-h-screen">
      <PageHeader />

      <section className="hv2-hero" style={{ paddingTop: 128 }}>
        <div className="hv2-wrap">
          <h1 className="hv2-serif hv2-h1" style={{ maxWidth: "11em" }}>
            Trust should be specific, <em>not implied.</em>
          </h1>
          <p className="hv2-lead">
            This page explains what Replysis processes, what it stores, how screen-capture controls work, and which claims we do not make.
          </p>
          <p className="hv2-fine">
            <Link href="/privacy" className="hv2-btn">Read the Privacy Policy</Link>
            <a href="mailto:admin@varoxel.com" className="hv2-link" style={{ marginLeft: 22 }}>Ask a privacy question</a>
          </p>
          <p className="hv2-fine" style={{ marginTop: 22 }}>Updated August 13, 2026.</p>
        </div>
      </section>

      <section className="hv2-section" style={{ paddingTop: 96 }}>
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">What happens during <em>a live session.</em></h2>
          <ol className="hv2-steps">
            {DATA_FLOW.map((item, i) => (
              <li key={item.number}>
                <div className="hv2-step-head">
                  <span className="hv2-serif hv2-step-n" aria-hidden>{i + 1}</span>
                  <h3 className="hv2-serif" style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.05rem)", lineHeight: 1.12, margin: 0 }}>{item.title}</h3>
                </div>
                <div>
                  <p className="hv2-p" style={{ marginTop: 0 }}>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Designed for standard paths. <em>Never a universal guarantee.</em></h2>
          <p className="hv2-p">{TRUST_FACTS.screenCapture}</p>
          <p className="hv2-p">
            Test the exact device, operating system, meeting app, recording mode, and sharing method before an important call. Follow employer and interview-platform rules.
          </p>
          <dl className="hv2-facts" style={{ marginTop: 36 }}>
            {CONTROLS.map((control) => (
              <div key={control.title}>
                <dt>{control.title}</dt>
                <dd>{control.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">What it will not claim, <em>and where it can be wrong.</em></h2>
          <dl className="hv2-facts">
            <div>
              <dt>AI limitations</dt>
              <dd>
                Suggestions require judgment. Generated answers, resume rewrites, scores, and feedback can be inaccurate or incomplete. Verify names, dates,
                metrics, technologies, and claims. Never present experience you do not have.
              </dd>
            </div>
            <div>
              <dt>Current assurance status</dt>
              <dd>
                No unverified compliance badges. Replysis does not currently claim SOC 2 certification, a contractual 99.9% uptime SLA, or a completed
                independent security audit. Those claims will appear only after the required assessment and evidence exist.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="hv2-section hv2-end">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">The public limits match <em>the product limits.</em></h2>
          <dl className="hv2-facts">
            {Object.values(PUBLIC_PLAN_CAPACITY).map((plan) => (
              <div key={plan.label}>
                <dt>{plan.label}</dt>
                <dd>
                  <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{answersLabel(plan.credits)} {plan.label === "Starter" ? "once" : "a month"}.</strong>{" "}
                  {plan.example}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ marginTop: 22 }}>
            <Link href="/pricing" className="hv2-link">See pricing</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
