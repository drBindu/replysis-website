import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real-Time Interview Copilot | Replysis",
  description: "AI-powered real-time interview assistant with resume-grounded suggestions that start in about a second.",
};

export default function RealInterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
