// The site's lock: one password (SITE_PASSWORD, set in .env.local and on Vercel).
// After you unlock, a cookie holds a fingerprint of the password (never the password itself).
// Changing SITE_PASSWORD signs out every browser, since old fingerprints stop matching.

export const AUTH_COOKIE = "bb_unlocked";

export async function fingerprint(password: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("benbadobee-unlocked-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Compares without leaking where the first difference is (timing-safe).
export function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Only allow going back to a page on this site after unlocking.
export function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
