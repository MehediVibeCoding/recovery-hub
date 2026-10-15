import "server-only";

/**
 * Cloudflare Turnstile সার্ভার-সাইড যাচাই (Mehediadmin-এর lib/turnstileServer.ts-এর মতো)।
 * TURNSTILE_SECRET_KEY না থাকলে স্কিপ (true) — কী বসালেই বাধ্যতামূলক হয়ে যায়।
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || typeof token !== "string" || token.length > 2048) return false;
  try {
    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}
