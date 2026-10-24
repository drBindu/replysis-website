import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started | Replysis AI",
  description: "Download Replysis, sign in, and get your first interview answer in about a minute.",
  alternates: { canonical: "/start" },
  robots: { index: false },
};

export default function StartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
