import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Terms of Service  -  Replysis",
  description: "Terms governing your use of Replysis.",
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT = "support@replysis.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <PageHeader />

      {/* Hero */}
      <section className="py-16 px-6" style={{ background: "linear-gradient(150deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Terms of Service</h1>
          <p className="text-gray-500">Last updated: {LAST_UPDATED} · Questions? <a href={`mailto:${CONTACT}`} className="text-zinc-900 hover:underline">{CONTACT}</a></p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-12 text-gray-600 leading-relaxed">

          <p className="text-sm bg-gray-50 border border-gray-100 rounded-xl p-5">
            By accessing or using Replysis at replysis.com or the Replysis desktop apps ("the Service"), you agree to these Terms. If you do not agree, do not use the Service.
          </p>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">1. The Service</h2>
            <p className="text-sm">Replysis provides interview preparation tools including a resume builder, mock interview mode, and a live interview copilot. The Service is intended for personal, non-commercial job-search use.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">2. Eligibility</h2>
            <p className="text-sm">You must be at least 18 years old to use Replysis. By creating an account, you confirm the information you provide is accurate and that you have the legal capacity to enter this agreement.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">3. Your account</h2>
            <p className="text-sm">You are responsible for keeping your credentials secure and for all activity under your account. Contact <a href={`mailto:${CONTACT}`} className="text-zinc-900 hover:underline">{CONTACT}</a> immediately if you suspect unauthorised access.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">4. Acceptable use</h2>
            <p className="text-sm mb-3">You agree not to:</p>
            <ul className="space-y-2">
              {[
                "Use the Service for any unlawful purpose",
                "Reverse-engineer, decompile, or extract the source code",
                "Generate harassing, defamatory, or fraudulent content",
                "Attempt to circumvent any security or access controls",
                "Share your account with others or resell access",
                "Use automated scripts or bots to interact with the Service",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">5. Subscriptions and payments</h2>
            <div className="space-y-4">
              {[
                { label: "Free tier", body: "A free tier with limited usage is available. No credit card required to start." },
                { label: "Paid plans", body: "Billed monthly or annually via Stripe. Prices are shown on the pricing page and may change with 30 days' notice." },
                { label: "Refunds", body: "Refunds are handled case by case at our discretion. Contact support@replysis.com and we will review your request. Purchases made through an app store follow that store's refund policy." },
                { label: "Cancellations", body: "Cancel any time. Your access continues until the end of the current billing period." },
                { label: "Credits", body: "Unused credits do not roll over between billing periods and have no cash value." },
              ].map((c, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                  <span className="font-bold text-gray-900">{c.label}: </span>
                  <span className="text-gray-600">{c.body}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">6. Intellectual property</h2>
            <p className="text-sm">All code, design, trademarks, and content forming Replysis are owned by us or our licensors. Content you create using the Service (such as your resume text) remains yours.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">7. Third-party services</h2>
            <p className="text-sm">The Service integrates with Stripe, Firebase, Groq, and Speechmatics. Use of these is subject to their own terms. We are not responsible for their actions or content.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">8. Disclaimer of warranties</h2>
            <p className="text-sm">The Service is provided "as is" without warranties of any kind. We do not guarantee it will be uninterrupted or error-free. Use Replysis as a preparation aid, not a substitute for your own judgment.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">9. Limitation of liability</h2>
            <p className="text-sm">To the maximum extent permitted by law, our total liability for any claim is limited to the amount you paid us in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">10. Termination</h2>
            <p className="text-sm">We may suspend or terminate your account for violations of these Terms. You may delete your account at any time from account settings.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">11. Changes to these Terms</h2>
            <p className="text-sm">If we make material changes, we'll notify you by email at least 14 days before they take effect. Continued use after that date constitutes acceptance.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-gray-900 mb-3">12. Governing law</h2>
            <p className="text-sm">These Terms are governed by applicable laws. Disputes will be resolved through good-faith negotiation first. If that fails, through binding arbitration.</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-6">
            <h2 className="text-base font-black text-gray-900 mb-2">Questions about these Terms?</h2>
            <p className="text-sm text-gray-600">Email us at <a href={`mailto:${CONTACT}`} className="text-zinc-900 font-semibold hover:underline">{CONTACT}</a>.</p>
          </div>

        </div>
      </section>

    </div>
  );
}
