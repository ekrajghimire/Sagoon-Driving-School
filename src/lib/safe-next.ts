/**
 * Only allow redirects to pages on this site. Rejects "//evil.com", "/\evil.com", "https://…",
 * and anything with control characters — all of which browsers can treat as another website.
 * Safe in client and server code.
 */
export function safeNext(next: string | null | undefined, fallback = "/account") {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://site.invalid");
    return u.origin === "https://site.invalid" ? `${u.pathname}${u.search}${u.hash}` : fallback;
  } catch {
    return fallback;
  }
}
