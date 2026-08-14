import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";

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
    tip: "Test the desktop overlay, microphone, system audio, and capture behavior in a practice call before your real interview.",
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
    <div className="marketing min-h-screen bg-[#FDFCFA] text-[#16150F]" style={{ fontFamily: "system-ui, sans-serif" }}>
      <PageHeader />

      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(150deg, #ffffff 0%, #fafafa 40%, #fafafa 80%, #ffffff 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-5 leading-[1.05]">
            3 steps.<br />
            <span style={{ background: "linear-gradient(135deg, #1C7A3E, #2E8B45, #21924A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Then review the suggestion.
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Add your resume, test your setup, and enter the interview with a structured source of guidance you can adapt naturally.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          {STEPS.map((s, i) => (
            <div key={i} className={`rounded-2xl border-2 ${s.light} p-8 md:p-10`}>
              <div className="flex items-start gap-6">
                <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-md`}>
                  {s.n}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">{s.title}</h2>
                  <p className={`text-sm font-semibold ${s.accent} mb-4`}>{s.sub}</p>
                  <p className="text-gray-600 leading-relaxed mb-6">{s.desc}</p>

                  <div className="space-y-3 mb-5">
                    {s.detail.map((d, j) => (
                      <div key={j} className="flex gap-3 text-sm">
                        <span className="font-bold text-gray-700 whitespace-nowrap min-w-[120px]">{d.label}</span>
                        <span className="text-gray-500">{d.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2.5 bg-white rounded-xl border border-gray-200 p-4">
                    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.355a7.5 7.5 0 01-3 0" />
                    </svg>
                    <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">Tip:</span> {s.tip}</p>
                  </div>
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex justify-center mt-8">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight text-center">Common questions</h2>
          <p className="text-gray-500 text-center mb-12">The things people ask before they try it.</p>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <h3 className="font-black text-gray-900 mb-2">{f.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Start your first session</h2>
          <p className="text-gray-500 mb-8">Free mock interviews, no credit card. See exactly how it feels before your real interview.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/mock-interview"
              className="px-8 py-4 rounded-xl font-black text-white transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #1C7A3E, #2E8B45)", boxShadow: "0 8px 24px rgba(31,138,62,0.3)" }}>
              Try mock interview free →
            </Link>
            <Link href="/features"
              className="px-8 py-4 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:border-zinc-400 hover:text-zinc-900 transition-all">
              See all features
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
