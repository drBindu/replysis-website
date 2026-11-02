import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proof and Reviews | Replysis",
  description: "Check that Replysis works in your browser, see what the service reports right now, and read reviews from verified customers.",
  alternates: { canonical: "/proof" },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
