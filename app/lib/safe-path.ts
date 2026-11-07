/**
 * Where to go after sign-in, from the `next` in the address bar, kept on this site.
 *
 * Checking only for a leading "/" and no "//" let "/\evil.com" and "/<tab>/evil.com" through: the browser reads both as
 * "//evil.com", so a link to replysis.com sent a signed-in visitor straight to another site. The path is now resolved
 * the way the browser resolves it, and anything that lands on another origin falls back to the default.
 */
export function safeInternalPath(value: string | null | undefined, fallback = "/real-interview"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  const base = "https://replysis.com";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
