"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "../app/firebaseConfig";
import { establishBrowserSession } from "../app/lib/auth-session";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

// Routes that require a logged-in user
const PROTECTED_PREFIXES = ["/real-interview", "/mock-interview", "/resume", "/admin"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Effect 1: Auth listener  -  runs ONCE only (never re-subscribes on nav).
  // onIdTokenChanged (not onAuthStateChanged) also fires every time Firebase
  // rotates the ID token (~hourly), so the cookie the middleware verifies is
  // always a live token. The cookie's max-age matches the token's own 1-hour
  // lifetime — a stolen cookie is useless once the token inside it expires,
  // instead of lingering for 7 days like before.
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        try {
          await establishBrowserSession(firebaseUser);
        } catch {
          console.error("Unable to establish the secure browser session.");
        }
      } else {
        void fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" });
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isProtectedRoute = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // Effect 2: Route protection  -  watches pathname separately to avoid re-subscribing auth
  useEffect(() => {
    if (loading) return;
    if (!user && isProtectedRoute) router.replace("/");
  }, [user, loading, isProtectedRoute, router]);

  // Only a protected route waits for Firebase. Gating everything meant the
  // marketing site shipped server-rendered HTML and then threw it away for a
  // spinner on hydration, which cost both the first paint and what crawlers
  // actually see. Public pages now render straight through.
  if (loading && isProtectedRoute) {
    return (
      <AuthContext.Provider value={{ user, loading }}>
        <div
          role="status"
          aria-live="polite"
          className="min-h-screen bg-[#FDFCFA] flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#1C7A3E] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#4A4A41] text-sm">Checking your sign-in…</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
