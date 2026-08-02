// app/lib/rate-limit.ts
// ─────────────────────────────────────────────────────────────────────
// Lightweight in-memory fixed-window rate limiter.
//
// The frontend runs as a single Node process (one Docker container), so a
// module-level Map is a correct and dependency-free store. This is a
// defense-in-depth backstop against abuse of expensive endpoints (minting
// Speechmatics tokens, hammering the admin API and burning Firestore quota).
// Credits already gate LLM cost; this guards the endpoints credits don't.
//
// Limits are intentionally generous so real usage is never blocked — a live
// interview refreshes its token roughly once every ~100s, and the admin page
// auto-polls every 120s, both far under these ceilings.
// ─────────────────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Opportunistic cleanup so the Map can't grow unbounded over a long uptime.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (now >= b.resetAt) store.delete(k);
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets (only meaningful when !ok)
}

/**
 * Fixed-window rate limit.
 * @param key      Unique identifier for the caller (uid/email preferred, else IP).
 * @param limit    Max requests allowed per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);

  const b = store.get(key);
  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/**
 * Return a proxy-provided address only when the deployment explicitly trusts
 * its reverse proxy. Without that opt-in, request headers are attacker input
 * and must not become an identity or rate-limit key.
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY !== "true") return "untrusted-proxy";

  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}
