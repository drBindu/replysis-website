import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Cookie Policy  -  Verchor",
  description: "What cookies Verchor sets and why.",
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT = "support@verchor.com";

const COOKIES = [
  { name: "__session",      type: "Essential",  duration: "Session",  purpose: "Keeps you signed in during your browser session. Set by Firebase Authentication." },
  { name: "firebaseToken",  type: "Essential",  duration: "30 days",  purpose: "Persists your login across browser restarts so you don't have to sign in every time." },
  { name: "__stripe_mid",   type: "Essential",  duration: "1 year",   purpose: "Used by Stripe to prevent fraud during payment. Only present when you access the billing page." },
  { name: "__stripe_sid",   type: "Essential",  duration: "Session",  purpose: "Used by Stripe for the duration of a checkout session." },
  { name: "cx_pref",        type: "Functional", duration: "6 months", purpose: "Stores your UI preferences (theme, mode settings) so they persist between visits." },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <PageHeader />

      {/* Hero */}
      <section className="py-16 px-6" style={{ background: "linear-gradient(150deg, #faf8ff 0%, #f4edff 50%, #fdf8ff 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Cookie Policy</h1>
          <p className="text-gray-500">Last updated: {LAST_UPDATED} · Questions? <a href={`mailto:${CONTACT}`} className="text-teal-600 hover:underline">{CONTACT}</a></p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-12 text-gray-600 leading-relaxed">

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">What is a cookie?</h2>
            <p className="text-sm">A cookie is a small text file your browser stores when you visit a website. Verchor uses a small number of cookies to keep you signed in and remember your preferences. We do not use advertising or tracking cookies of any kind.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">Cookies we set</h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Duration</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIES.map((c, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                      <td className="px-5 py-4 font-mono text-xs text-indigo-600">{c.name}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          c.type === "Essential"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-teal-100 text-teal-700"
                        }`}>{c.type}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{c.duration}</td>
                      <td className="px-5 py-4 text-xs text-gray-500">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">Local storage</h2>
            <p className="text-sm">In addition to cookies, Verchor uses browser <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code> to store your resume draft and session preferences locally on your machine. This data never leaves your device unless you explicitly submit it through the app.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">What we never use cookies for</h2>
            <ul className="space-y-2">
              {[
                "We do not use advertising or retargeting cookies.",
                "We do not use third-party analytics cookies (no Google Analytics, no Meta Pixel).",
                "We do not track you across other websites.",
                "We do not sell cookie data to any third party.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">Managing cookies</h2>
            <p className="text-sm mb-4">You can control cookies through your browser settings. Blocking essential cookies will prevent you from staying signed in but won't otherwise break the site.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { browser: "Chrome",  setting: "chrome://settings/cookies" },
                { browser: "Firefox", setting: "about:preferences#privacy" },
                { browser: "Safari",  setting: "Preferences → Privacy" },
                { browser: "Edge",    setting: "edge://settings/privacy" },
              ].map((b, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-sm">{b.browser}</span>
                  <code className="text-[11px] text-indigo-600 font-mono">{b.setting}</code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">Changes to this policy</h2>
            <p className="text-sm">If we start using new cookies we'll update this page and notify you in the app before they're set.</p>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50 p-6">
            <h2 className="text-base font-black text-gray-900 mb-2">Questions?</h2>
            <p className="text-sm text-gray-600">Email us at <a href={`mailto:${CONTACT}`} className="text-teal-600 font-semibold hover:underline">{CONTACT}</a>.</p>
          </div>

        </div>
      </section>

    </div>
  );
}
