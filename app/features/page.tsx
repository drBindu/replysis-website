import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";
import "../home-v2.css";

export const metadata: Metadata = {
  title: "Features  -  Replysis",
  description: "A connected toolkit for resume preparation, interview practice, and live guidance.",
};

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Desktop Capture Controls",
    tagline: "Designed for standard screen-share paths.",
    desc: "The desktop overlay uses operating-system capture controls unavailable in a normal browser tab. Coverage depends on the operating system, meeting tool, recorder, and proctoring environment, so test your exact setup first.",
    points: ["OS-level capture controls", "Windows and macOS desktop apps", "Setup-dependent coverage", "Instant hotkey hide/show"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Resume-Grounded Answers",
    tagline: "Suggestions use the background you provide.",
    desc: "Upload your resume and Replysis uses its roles, projects, skills, and achievements as context. AI output can still be incomplete or inaccurate, so review every suggestion and keep only wording that reflects your real experience.",
    points: ["Resume-grounded context", "Can reference supplied projects and metrics", "Role and company-aware prompts", "Answer style you can review and adapt"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: "bg-zinc-800",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Fast Streaming Responses",
    tagline: "Suggestions stream as they generate.",
    desc: "Replysis is designed around a sub-two-second response target for live use. Exact timing depends on the network, transcription, question length, model, and provider availability.",
    points: ["Token-by-token answer streaming", "Low-latency transcription", "Sub-two-second response target", "Clear service-state feedback"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Major Platform Support",
    tagline: "Built for common interview workflows.",
    desc: "The native desktop app supports system audio workflows alongside major meeting and interview tools. Compatibility can vary by device, permissions, and platform configuration.",
    points: ["System-level audio capture", "No browser extension required", "Zoom, Meet, Teams, and Webex workflows", "One-way interview support where compatible"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Mock Interview Mode",
    tagline: "Practice realistic questions before they count.",
    desc: "Generate a role-aware question set, answer aloud, and receive structured feedback on clarity, relevance, and delivery. AI scoring is coaching guidance, not an employer assessment.",
    points: ["Role-aware generated questions", "Feedback on structure and clarity", "Suggestions for a stronger answer", "Session history to review progress"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    color: "bg-zinc-800",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Smart Resume Builder",
    tagline: "Role-aware resume drafting with keyword and structure guidance.",
    desc: "Paste in your experience and choose your target role. Replysis suggests clearer bullet points, relevant keywords, and impact-focused phrasing. No tool can guarantee an ATS result, so review accuracy before exporting. The same resume can then provide context for live answer suggestions.",
    points: ["ATS keyword optimization for your target role", "Impact-first bullet rewrites with real metrics", "Role-specific language for SWE, PM, DS, Design", "Export to PDF or plain text instantly"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Transparent Privacy Controls",
    tagline: "Know where interview data goes.",
    desc: "Live audio streams to our speech-to-text provider and is not stored by Replysis. Transcripts and resume context are processed to generate output; saved session history is stored in your account until deletion.",
    points: ["Raw audio not stored by Replysis", "Provider processing explained", "Saved history controlled through your account", "Payment details handled by Stripe"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    color: "bg-zinc-800",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Native Desktop App",
    tagline: "Windows and macOS controls for live workflows.",
    desc: "The browser is suitable for practice. The desktop app adds system audio and capture controls that browser tabs cannot provide. Test device permissions and capture behavior before live use.",
    points: ["Windows and macOS installers", "System audio support", "Standard capture-path controls", "Quick hotkey hide/show"],
  },
  {
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    color: "bg-zinc-900",
    light: "bg-zinc-100 border-zinc-200",
    accent: "text-zinc-900",
    title: "Role-Specific Answers",
    tagline: "Tuned for your exact role and company.",
    desc: "Set the target role, company, and job description so Replysis can adapt its suggestions to the context you provide. Always review the facts and choose wording that reflects your real experience.",
    points: ["Target role: SWE, PM, Data Science, Marketing, Design", "Company context: big tech, startup, FAANG, Indian tech", "Calibrated answer length and structure by role", "STAR format auto-applied for behavioral questions"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="marketing hv2 min-h-screen">
      <PageHeader />

      <section className="hv2-hero" style={{ paddingTop: 128 }}>
        <div className="hv2-wrap">
          <h1 className="hv2-serif hv2-h1" style={{ maxWidth: "12em" }}>
            What it does, <em>and where it stops.</em>
          </h1>
          <p className="hv2-lead">
            A connected toolkit for resume preparation, structured practice, and fast live guidance, with clear limits and no inflated promises.
          </p>
          <p className="hv2-fine">
            <Link href="/mock-interview" className="hv2-btn">Start free</Link>
            <Link href="/pricing" className="hv2-link" style={{ marginLeft: 22 }}>See pricing</Link>
          </p>
        </div>
      </section>

      <section className="hv2-section" style={{ paddingTop: 96 }}>
        <div className="hv2-wrap">
          <ul className="hv2-index">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <div>
                  <h2 className="hv2-serif" style={{ fontSize: "clamp(1.45rem, 2.4vw, 1.9rem)", lineHeight: 1.15, margin: 0 }}>{f.title}</h2>
                  <p className="hv2-tagline">{f.tagline}</p>
                </div>
                <div>
                  <p>{f.desc}</p>
                  <p className="hv2-points">
                    {f.points.map((point) => (
                      <span key={point} style={{ display: "block" }}>{point}</span>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hv2-section hv2-end">
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Try it on a practice <em>question first.</em></h2>
          <p className="hv2-p">Free to start, no credit card.</p>
          <p className="hv2-fine">
            <Link href="/mock-interview" className="hv2-btn">Start practicing free</Link>
            <Link href="/how-it-works" className="hv2-link" style={{ marginLeft: 22 }}>See how it works</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
