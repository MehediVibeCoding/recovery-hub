/**
 * HMAC-SHA256 সই করা টোকেন (সেশন কুকি ও অ্যাডমিন→হাব SSO টোকেন দুটোতেই)।
 *
 * Web Crypto ব্যবহার করে — তাই Next middleware (edge runtime) ও Node route, দুই জায়গাতেই চলে।
 * ফরম্যাট: base64url(JSON payload) + "." + base64url(HMAC)
 * যাচাই constant-time (crypto.subtle.verify) — টাইমিং অ্যাটাক খাটে না।
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** সই ঠিক থাকলে payload ফেরত দেয়; মেয়াদ (exp, unix সেকেন্ড) পার হলে বা সই ভুল হলে null */
export async function verifyToken<T extends { exp?: number }>(
  token: string | undefined | null,
  secret: string
): Promise<T | null> {
  if (!token || token.length > 2048) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = b64urlDecode(token.slice(dot + 1));
  if (!sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sig as BufferSource, enc.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  const raw = b64urlDecode(body);
  if (!raw) return null;
  try {
    const payload = JSON.parse(dec.decode(raw)) as T;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
