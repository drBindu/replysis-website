import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account & Billing | Replysis",
  description: "Manage your Replysis plan, your answers, and secure Stripe billing.",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
