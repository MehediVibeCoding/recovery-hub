import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readSessionToken, SESSION_COOKIE, type SessionPayload } from "./session";

/**
 * middleware.ts ছাড়াও (দ্বিতীয় স্তর) প্রতিটা পেজ-লেআউট, সার্ভার অ্যাকশন ও API রুট নিজে সেশন যাচাই করে —
 * ভবিষ্যতে কখনো middleware এড়িয়ে যাওয়ার মতো বাগ ধরা পড়লেও ডাটা খোলা থাকবে না
 * (Mehediadmin-এর lib/auth-guard.ts-এর একই নীতি)।
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("অনুমতি নেই");
    this.name = "UnauthorizedError";
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

/** সার্ভার অ্যাকশন/ডাটা ফাংশনের জন্য — সেশন না থাকলে throw */
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

/** পেজ/লেআউটের জন্য — সেশন না থাকলে সাধারণ 404 */
export async function requireSessionOrNotFound(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) notFound();
  return s;
}
