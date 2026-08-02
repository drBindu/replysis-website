import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "How It Works  -  Verchor",
  description: "Three steps: upload your resume, start your interview, get the answer.",
};

const STEPS = [
  {
    n: "01",
    color: "bg-indigo-600",
    light: "bg-indigo-50 border-indigo-100",
    accent: "text-indigo-600",
    title: "Upload your resume",
    sub: "Takes 30 seconds. Works for every job you apply to.",
    desc: "Paste your resume text or upload a PDF. Verchor reads every role, project, metric, and skill you've listed. This becomes the context engine behind every answer, so nothing it says will ever sound generic or disconnected from your actual background.",
    detail: [
      { label: "What it reads", value: "Job titles, companies, dates, projects, technologies, achievements, metrics" },
      { label: "How it's stored", value: "Locally in your browser session. Not uploaded to any server permanently." },
      { label: "How often", value: "Once per job application. Update it whenever your resume changes." },
    ],
    tip: "Include specific metrics in your resume (e.g. 'reduced latency by 40%'). Verchor will reference them directly in live answers.",
  },
  {
    n: "02",
    color: "bg-violet-600",
    light: "bg-violet-50 border-violet-100",
    accent: "text-violet-600",
    title: "Open Verchor before your interview",
    sub: "Desktop app for real interviews. Browser for practice.",
    desc: "Download the Windows or macOS app for live interviews. It captures audio at the system level, so no browser microphone permission prompts and no chance of the overlay appearing in screen-share. For mock practice, the browser version works perfectly.",
    detail: [
      { label: "For live interviews", value: "Use the Windows (.msix) or macOS (.pkg) desktop app. System audio capture, overlay fully hidden from screen-share." },
      { label: "For practice", value: "Browser version at verchor.com/real-interview or /mock-interview. No install needed." },
      { label: "Setup time", value: "Under 60 seconds from download to first answer." },
    ],
    tip: "Test the stealth overlay in a Zoom call with a friend before your real interview. It takes 2 minutes and confirms everything is working.",
  },
  {
    n: "03",
    color: "bg-orange-500",
    light: "bg-orange-50 border-orange-100",
    accent: "text-orange-600",
    title: "Answer every question with confidence",
    sub: "1.8 seconds from question end to answer on screen.",
    desc: "Your interviewer asks a question. Verchor picks it up via your microphone, transcribes it in real time, matches it against your resume context, and streams a tailored answer to your private overlay in under 2 seconds. You read it naturally, in your own words.",
    detail: [
      { label: "What you see", value: "A private floating overlay showing the answer, streaming token-by-token." },
      { label: "What your interviewer sees", value: "Only you. The overlay is completely invisible to screen-share and recording." },
      { label: "Speed", value: "1.8s average from the moment the question ends to the first word on screen." },
    ],
    tip: "Don't read the answer word-for-word. Use it as a structured outline and speak naturally. It will sound completely authentic.",
  },
];

const FAQS = [
  { q: "Can the interviewer detect Verchor?", a: "No. The stealth overlay is built specifically to be invisible to screen-share on Zoom, Teams, Meet, and Webex. It doesn't appear in recordings either. We have tested this extensively." },
  { q: "Does it work for HireVue and one-way video interviews?", a: "Yes. HireVue uses your microphone and webcam. Verchor works at the system audio level, so it captures the questions whether they're read aloud by the platform or by a human interviewer." },
  { q: "What if the answer isn't right?", a: "Every answer is grounded in your resume, so it will always reference your real experience. If a specific answer doesn't fit, ignore it and use your own words. Think of it as a live outline, not a script." },
  { q: "Do I need the desktop app, or can I use the browser?", a: "For mock practice, the browser is perfect. For real interviews, we strongly recommend the desktop app. It uses system audio capture which gives you true stealth. The browser version requires microphone access which can occasionally trigger platform warnings." },
  { q: "Is my data safe?", a: "Your audio never leaves your device. Raw audio is processed locally. Only the text transcript is sent to the LLM for answer generation, and that's discarded after each response. We don't store conversation history or sell your data." },
  { q: "How is this different from just Googling answers?", a: "Every answer is generated in real time from your actual resume. You're not reading a generic answer. You're getting a response that references your specific projects, metrics, and experience, which sounds authentic and avoids the obvious 'I Googled this' tells." },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <PageHeader />

      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 40%, #fff4ec 80%, #fdf8ff 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-5 leading-[1.05]">
            3 steps.<br />
            <span style={{ background: "linear-gradient(135deg, #6d28d9, #9333ea, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Then you win.
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            No complex setup. Upload your resume, open the app, and walk into every interview with the right answer already on screen.
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
              style={{ background: "linear-gradient(135deg, #6d28d9, #9333ea)", boxShadow: "0 8px 24px rgba(109,40,217,0.3)" }}>
              Try mock interview free →
            </Link>
            <Link href="/features"
              className="px-8 py-4 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:border-violet-300 hover:text-violet-700 transition-all">
              See all features
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
