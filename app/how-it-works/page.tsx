import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";
import "../home-v2.css";

export const metadata: Metadata = {
  title: "How It Works  -  Replysis",
  description: "Three steps: upload your resume, start your interview, get the answer.",
};

const STEPS = [
  {
    n: "01",
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Upload your resume",
    sub: "Takes 30 seconds. Works for every job you apply to.",
    desc: "Paste your resume text or upload a PDF. Replysis uses the roles, projects, metrics, and skills you provide as context for answer suggestions. Review generated content before using it.",
    detail: [
      { label: "What it reads", value: "Job titles, companies, dates, projects, technologies, achievements, metrics" },
      { label: "How it's handled", value: "Drafts may be stored locally. Submitted resume text is processed by Replysis and the selected AI provider; saved sessions can include a short resume snippet." },
      { label: "How often", value: "Once per job application. Update it whenever your resume changes." },
    ],
    tip: "Include specific metrics in your resume (e.g. 'reduced latency by 40%'). Replysis will reference them directly in live answers.",
  },
  {
    n: "02",
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Open Replysis before your interview",
    sub: "Desktop app for real interviews. Browser for practice.",
    desc: "Download the Windows or macOS app for live interviews. It adds system audio and operating-system capture controls that a normal browser tab cannot provide. For mock practice, the browser version requires no installation.",
    detail: [
      { label: "For live interviews", value: "Use the Windows or macOS desktop app for system audio and standard capture-path exclusion. Test the exact setup first." },
      { label: "For practice", value: "Browser version at replysis.com/real-interview or /mock-interview. No install needed." },
      { label: "Setup time", value: "Under 60 seconds from download to first answer." },
    ],
    tip: "Test the desktop overlay, microphone, system audio, and capture behavior in a practice call before your real interview. In the real Zoom, Teams or Meet interview, turn off Use my microphone in Settings so only the interviewer is heard.",
  },
  {
    n: "03",
    color: "bg-zinc-800",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Review a suggestion for each question",
    sub: "Designed around a sub-two-second response-start target.",
    desc: "Replysis transcribes the question, matches it against the context you provide, and streams a tailored answer suggestion to the overlay. Treat it as an outline, verify the facts, and respond in your own words.",
    detail: [
      { label: "What you see", value: "A focused floating overlay showing the suggestion, streaming token-by-token." },
      { label: "Capture behavior", value: "The desktop app targets standard screen-share paths. Coverage depends on the operating system and capture tool." },
      { label: "Speed", value: "Designed for a sub-two-second response start; network and provider conditions can affect timing." },
    ],
    tip: "Do not read the answer word-for-word. Use it as a structured outline, verify the facts, and respond naturally in your own words.",
  },
];

const FAQS = [
  { q: "Can Replysis be excluded from screen sharing?", a: "The desktop app uses operating-system controls designed for standard capture paths. Coverage varies by operating system, meeting tool, recorder, and proctoring environment, so there is no universal guarantee. Test your setup and follow the rules of the interview." },
  { q: "Does it work for HireVue and one-way video interviews?", a: "Replysis is designed for audio-based interview workflows, including one-way sessions, but compatibility depends on the device, permissions, and platform configuration." },
  { q: "What if the answer isn't right?", a: "AI suggestions can be incomplete or wrong. Ignore anything that does not fit, verify every fact, and use your own words. Replysis is an outline and coaching tool, not a source of guaranteed answers." },
  { q: "Do I need the desktop app, or can I use the browser?", a: "The browser is suitable for practice. The desktop app adds system audio and operating-system capture controls for live workflows. Always test microphone, audio, and capture behavior before an important call." },
  { q: "How is my data handled?", a: "Live audio streams to our speech-to-text provider and is not stored by Replysis. Transcripts and resume context are processed to generate answers. If you use saved history, session content is stored in your account until deletion. See the Trust Center and Privacy Policy for details." },
  { q: "How is this different from just Googling answers?", a: "Replysis can use the resume, role, company, and job description you provide as context for a live suggestion. AI output may still be incomplete or wrong, so verify the facts and adapt the wording to your real experience." },
];

export default function HowItWorksPage() {
  return (
    <div className="marketing hv2 min-h-screen">
      <PageHeader />

      <section className="hv2-hero" style={{ paddingTop: 128 }}>
        <div className="hv2-wrap">
          <h1 className="hv2-serif hv2-h1" style={{ maxWidth: "12em" }}>
            Three steps, <em>then you review the answer.</em>
          </h1>
          <p className="hv2-lead">
            Add your resume, test your setup, and enter the interview with a structured source of guidance you can adapt naturally.
          </p>
        </div>
      </section>

      <section className="hv2-section" style={{ paddingTop: 96 }}>
        <div className="hv2-wrap">
          <ol className="hv2-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <div className="hv2-step-head">
                  <span className="hv2-serif hv2-step-n" aria-hidden>{i + 1}</span>
                  <h2 className="hv2-serif" style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.05rem)", lineHeight: 1.12, margin: 0 }}>{s.title}</h2>
                  <p className="hv2-tagline">{s.sub}</p>
                </div>
                <div>
                  <p className="hv2-p" style={{ marginTop: 0 }}>{s.desc}</p>
                  <dl className="hv2-facts hv2-facts-tight">
                    {s.detail.map((d) => (
                      <div key={d.label}>
                        <dt>{d.label}</dt>
                        <dd>{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="hv2-tip"><strong>Tip.</strong> {s.tip}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hv2-section">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Questions people ask <em>before they try it.</em></h2>
          <ul className="hv2-index">
            {FAQS.map((f) => (
              <li key={f.q}>
                <h3 className="hv2-serif" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", lineHeight: 1.2, margin: 0 }}>{f.q}</h3>
                <p>{f.a}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hv2-section hv2-end">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Start your first <em>session.</em></h2>
          <p className="hv2-p">Free mock interviews, no credit card. See exactly how it feels before your real interview.</p>
          <p className="hv2-fine">
            <Link href="/mock-interview" className="hv2-btn">Try a mock interview free</Link>
            <Link href="/features" className="hv2-link" style={{ marginLeft: 22 }}>See all features</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
