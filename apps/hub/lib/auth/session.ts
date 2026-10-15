import { signToken, verifyToken } from "./token";

/**
 * হাবের সেশন কুকি — stateless, সই করা (HUB_SESSION_SECRET)।
 * middleware (edge) আর সার্ভার কোড (Node) দুই জায়গা থেকেই ব্যবহার হয়, তাই "server-only" নেই।
 * সব সেশন একসাথে বাতিল করতে HUB_SESSION_SECRET বদলে দিলেই হয়।
 */
export interface SessionPayload {
  v: 1;
  iat: number;
  exp: number;
  /** কীভাবে ঢুকেছে: pw = পাসওয়ার্ড, sso = অ্যাডমিন প্যানেল থেকে */
  m: "pw" | "sso";
}

// __Host- প্রিফিক্স: ব্রাউজার জোর করে Secure + Path=/ + Domain-হীন রাখে (সাবডোমেইন থেকে কুকি ঢোকানো যায় না)।
// লোকাল http dev-এ Secure কুকি চলে না, তাই শুধু production-এ।
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hub_session" : "hub_session";

export function sessionSecret(): string | null {
  const s = (process.env.HUB_SESSION_SECRET ?? "").trim();
  return s.length >= 32 ? s : null;
}

export function sessionTtlSeconds(): number {
  const h = Number(process.env.HUB_SESSION_HOURS);
  const hours = Number.isFinite(h) && h >= 1 && h <= 72 ? h : 12;
  return Math.floor(hours * 3600);
}

export async function createSessionToken(method: SessionPayload["m"]): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("HUB_SESSION_SECRET সেট করা নেই (কমপক্ষে ৩২ অক্ষর)");
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { v: 1, iat: now, exp: now + sessionTtlSeconds(), m: method };
  return signToken(payload as unknown as Record<string, unknown>, secret);
}

export async function readSessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const p = await verifyToken<SessionPayload>(token, secret);
  return p && p.v === 1 ? p : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
