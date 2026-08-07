import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real-Time Interview Copilot | Replysis",
  description: "AI-powered real-time interview assistant. Upload your resume, listen to questions, and get resume-grounded answers in under 2 seconds.",
};

export default function RealInterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
