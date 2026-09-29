import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Replysis AI",
  description: "Compare Replysis Starter, Pro, and Max plans with clear monthly answers and secure Stripe checkout.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
