"use client";

import { useEffect, useState } from "react";

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="flex flex-col min-h-[80vh]">{children}</div>;

  return <div className="flex flex-col min-h-[80vh]">{children}</div>;
}