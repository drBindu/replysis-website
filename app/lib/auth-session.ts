"use client";

import type { User } from "firebase/auth";

/**
 * Establish the short-lived, HTTP-only session used by protected routes.
 * The server also creates a missing Starter profile atomically, so a new user
 * always reaches the product with the advertised 100-credit balance.
 */
export async function establishBrowserSession(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error("secure_session_unavailable");
  }
}
