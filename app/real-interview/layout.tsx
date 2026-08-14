import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real-Time Interview Copilot | Replysis",
  description: "AI-powered real-time interview assistant with resume-grounded suggestions and a sub-two-second response target.",
};

export default function RealInterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
