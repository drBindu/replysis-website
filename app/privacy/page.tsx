import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy  -  Replysis",
  description: "How Replysis collects, uses, and protects your data.",
};

const LAST_UPDATED = "August 13, 2026";
const CONTACT = "support@replysis.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <PageHeader />

      {/* Hero */}
      <section className="py-16 px-6" style={{ background: "linear-gradient(150deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: {LAST_UPDATED} · Questions? <a href={`mailto:${CONTACT}`} className="text-zinc-900 hover:underline">{CONTACT}</a></p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-12 text-gray-600 leading-relaxed">

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">1. Who we are</h2>
            <p>Replysis ("we", "us", "our") operates replysis.com and the Replysis desktop apps for Windows and macOS. If you have questions about this policy, email us at <a href={`mailto:${CONTACT}`} className="text-zinc-900 hover:underline">{CONTACT}</a>.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">2. What we collect</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Account information", body: "Your email address. If you use Google Sign-In, your Google profile name and photo. Managed securely via Firebase Authentication." },
                { title: "Resume and job content", body: "Drafts may be stored in your browser. When you request AI output, resume and job-description text is sent through Replysis to the selected AI provider. Saved interview sessions can include a short resume snippet." },
                { title: "Interview audio and transcripts", body: "Live audio streams from your device to our speech-to-text provider. Replysis does not store raw audio on its application servers. Transcripts are processed to generate output and may be stored when you use saved session history." },
                { title: "Payment information", body: "Handled entirely by Stripe. We never see or store your card number, CVV, or bank details. Only your subscription status reaches our servers." },
                { title: "Usage and service data", body: "We record account-linked service metadata such as feature used, request count, transcript character count, duration, timestamps, credit balance, and error diagnostics. Usage logs are not intended to contain transcript text." },
              ].map((c, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{c.title}</h3>
                  <p className="text-sm text-gray-500">{c.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">3. What we never do</h2>
            <ul className="space-y-2">
              {[
                "Replysis does not store raw interview audio on its application servers.",
                "Saved session history can contain interview questions, answers, company, role, duration, and a short resume snippet.",
                "We do not sell your data to third parties.",
                "We do not use your content to train a Replysis-owned model; subprocessors handle content under their own service terms.",
                "We do not share your resume or interview content with employers.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">4. How we use your data</h2>
            <p className="mb-3 text-sm">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>Operate and maintain your account</li>
              <li>Process payments and manage your subscription</li>
              <li>Provide the resume builder, mock interview, and live copilot features</li>
              <li>Send transactional emails (account confirmation, receipts)</li>
              <li>Debug issues and improve the product</li>
            </ul>
            <p className="text-sm mt-3">We will never send unsolicited marketing emails without your explicit consent.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">5. Third-party services</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { name: "Firebase (Google)", purpose: "Authentication and account management" },
                { name: "Stripe", purpose: "Payment processing and subscription management" },
                { name: "Groq", purpose: "Language-model inference for text prompts" },
                { name: "OpenAI", purpose: "Language-model inference when an OpenAI model is selected" },
                { name: "Google Gemini", purpose: "Language-model inference when a Gemini model is selected" },
                { name: "Speechmatics", purpose: "Real-time speech-to-text; live audio streams directly to this provider" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="font-bold text-gray-900 text-xs mb-1">{s.name}</p>
                  <p className="text-gray-500 text-xs">{s.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">6. Data retention</h2>
            <p className="text-sm">Account, subscription, credit, and saved-session data is retained while your account is active or as needed for legal, fraud-prevention, and billing obligations. Saved session history remains until it is deleted. We aim to complete verified account-deletion requests within 30 days unless retention is legally required.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">7. Your rights</h2>
            <p className="text-sm mb-3">Depending on where you live, you may have the right to access, correct, or delete your data, restrict processing, or request portability. Email <a href={`mailto:${CONTACT}`} className="text-zinc-900 hover:underline">{CONTACT}</a> and we will respond within the timeframe required by applicable law.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">8. Security</h2>
            <p className="text-sm">Web traffic uses HTTPS. Authentication credentials are handled by Firebase Authentication and supported identity providers; Replysis does not store plaintext passwords. Card details are collected by Stripe and do not pass through Replysis application servers. We also use server-side authorization checks, request limits, input-size limits, and account-ownership checks. No internet service can promise absolute security.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">9. Changes to this policy</h2>
            <p className="text-sm">If we make material changes, we'll notify you by email or site notice at least 14 days before the change takes effect.</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-6">
            <h2 className="text-base font-black text-gray-900 mb-2">Questions?</h2>
            <p className="text-sm text-gray-600">Email us at <a href={`mailto:${CONTACT}`} className="text-zinc-900 font-semibold hover:underline">{CONTACT}</a>. We'll respond within 2 business days.</p>
          </div>

        </div>
      </section>

    </div>
  );
}
