// app/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Credentials prefer NEXT_PUBLIC_* env vars (set on your server/CI).
// Firebase client config is a public identifier  -  security is enforced by
// Firebase Security Rules and the server-side Admin SDK, not by keeping
// these values secret.
// Values come from NEXT_PUBLIC_FIREBASE_* env vars (set at build/deploy time).
// These are public client identifiers, but we keep them out of source so the repo
// stays clean and GitHub's secret scanner doesn't false-positive on the web API key.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Initialize app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app); // 2. Added this line to initialize Firestore
export { app };