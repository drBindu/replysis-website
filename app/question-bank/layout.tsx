import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Question Bank | Replysis",
  description: "Browse interview questions by role and practice your answers, with outlines of what a strong answer covers and mistakes to avoid.",
  alternates: { canonical: "/question-bank" },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
