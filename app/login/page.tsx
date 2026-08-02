"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /login is no longer used  -  auth is handled via modal on the landing page.
 * Any direct visit here is immediately sent to home.
 */
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
