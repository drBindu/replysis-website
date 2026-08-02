"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /signup — redirects to home where the auth modal lives.
 * This prevents the 404 when the desktop app or any link points here.
 */
export default function SignupPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
