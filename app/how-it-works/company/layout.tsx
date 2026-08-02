import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

const brandFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "Verchor | Focused software for meaningful work",
  description:
    "Verchor is an independent software company building focused tools for high-stakes professional moments.",
};

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <div className={brandFont.variable}>{children}</div>;
}
