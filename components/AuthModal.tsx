"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../app/firebaseConfig";
import { initializeUserCredits } from "../app/lib/credits";

type Mode = "signin" | "signup" | "reset";

interface Props {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess?: () => void;
}

const FRIENDLY: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email":        "Please enter a valid email address.",
  "auth/weak-password":        "Password must be at least 6 characters.",
  "auth/user-not-found":       "No account found with this email.",
  "auth/wrong-password":       "Incorrect password.",
  "auth/too-many-requests":    "Too many attempts. Please wait a moment and try again.",
  "auth/invalid-credential":   "Invalid email or password.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
};

export default function AuthModal({ open, initialMode = "signin", onClose, onSuccess }: Props) {
  const [mode, setMode]         = useState<Mode>(initialMode);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const switchMode = (m: Mode) => { setMode(m); setError(""); setSuccess(""); setPassword(""); };
  const clear = () => { setError(""); setSuccess(""); };

  const saveUser = async (user: any) => {
    try { await initializeUserCredits(user.uid, user.email || "", user.displayName || name || "User"); } catch {}
  };

  const handleGoogle = async () => {
    clear(); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      if (result.user) await saveUser(result.user);
      onSuccess?.(); onClose();
    } catch (err: any) { setError(FRIENDLY[err.code] ?? "Something went wrong."); }
    finally { setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); clear(); setLoading(true);
    try {
      let result;
      if (mode === "signup") {
        result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user) {
          // Send verification email  -  ignore errors so signup still completes
          try { await sendEmailVerification(result.user); } catch {}
          await saveUser(result.user);
          setSuccess("Account created! Please check your inbox to verify your email.");
          setLoading(false);
          return; // stay on modal so user sees the message; they sign in after verifying
        }
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user) await saveUser(result.user);
        onSuccess?.(); onClose();
      }
    } catch (err: any) { setError(FRIENDLY[err.code] ?? "Something went wrong."); }
    finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); clear(); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Reset link sent! Check your inbox.");
    } catch (err: any) { setError(FRIENDLY[err.code] ?? "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(124,58,237,0.10)" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-[14px] font-extrabold text-gray-900">
                    Verchor{" "}
                    <span style={{ background: "linear-gradient(135deg,#7c3aed,#ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI</span>
                  </span>
                </div>
                <button onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 pt-5 pb-6">
                {/* Title */}
                <AnimatePresence mode="wait">
                  <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }} className="mb-5">
                    <h2 className="text-[20px] font-black text-gray-900 tracking-tight">
                      {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
                    </h2>
                    <p className="text-[13px] text-gray-400 mt-0.5">
                      {mode === "signin" ? "Sign in to continue to Verchor"
                        : mode === "signup" ? "Start with 100 free AI credits. No card needed."
                        : "We'll send a reset link to your inbox"}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Google */}
                {mode !== "reset" && (
                  <>
                    <button onClick={handleGoogle} disabled={loading}
                      className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">or</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  </>
                )}

                {/* Form */}
                <AnimatePresence mode="wait">
                  <motion.form key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onSubmit={mode === "reset" ? handleReset : handleEmail}
                    className="flex flex-col gap-3">

                    {mode === "signup" && (
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Full name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required
                          className="w-full border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all" />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Email</label>
                      <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear(); }} placeholder="you@example.com" required
                        className="w-full border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all" />
                    </div>

                    {mode !== "reset" && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                          {mode === "signin" && (
                            <button type="button" onClick={() => switchMode("reset")}
                              className="text-[11px] text-violet-600 hover:text-violet-800 font-medium transition-colors">Forgot?</button>
                          )}
                        </div>
                        <div className="relative">
                          <input type={showPass ? "text" : "password"} value={password}
                            onChange={e => { setPassword(e.target.value); clear(); }}
                            placeholder={mode === "signup" ? "Min 6 characters" : "Your password"} required
                            className="w-full border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 rounded-xl px-3.5 py-2.5 pr-10 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all" />
                          <button type="button" onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                            {showPass
                              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
                              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            }
                          </button>
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {error && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</motion.p>
                      )}
                      {success && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="text-[12px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{success}</motion.p>
                      )}
                    </AnimatePresence>

                    <button type="submit" disabled={loading}
                      className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                      style={{ background: "linear-gradient(135deg,#6d28d9,#ea580c)", boxShadow: "0 4px 16px rgba(109,40,217,0.28)" }}>
                      {loading ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          {mode === "signup" ? "Creating…" : mode === "reset" ? "Sending…" : "Signing in…"}
                        </>
                      ) : (
                        mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"
                      )}
                    </button>
                  </motion.form>
                </AnimatePresence>

                {/* Mode switch */}
                <div className="mt-5 text-center">
                  {mode === "signin" && (
                    <p className="text-[12px] text-gray-400">
                      No account?{" "}
                      <button onClick={() => switchMode("signup")} className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">Sign up free</button>
                    </p>
                  )}
                  {mode === "signup" && (
                    <p className="text-[12px] text-gray-400">
                      Already have an account?{" "}
                      <button onClick={() => switchMode("signin")} className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">Sign in</button>
                    </p>
                  )}
                  {mode === "reset" && (
                    <button onClick={() => switchMode("signin")} className="text-[12px] text-gray-400 hover:text-gray-700 flex items-center gap-1.5 mx-auto transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to sign in
                    </button>
                  )}
                </div>

                {mode === "signup" && (
                  <p className="text-[11px] text-gray-300 text-center mt-4 leading-relaxed">
                    By signing up you agree to our{" "}
                    <a href="/terms" className="text-gray-400 hover:text-gray-600 underline underline-offset-2">Terms</a>{" "}&{" "}
                    <a href="/privacy" className="text-gray-400 hover:text-gray-600 underline underline-offset-2">Privacy Policy</a>.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
