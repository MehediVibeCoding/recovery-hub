"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { writeAudit } from "../../../lib/audit";
import { sendHubLoginAlert } from "../../../lib/auth/alert";
import { clientIp } from "../../../lib/auth/request";
import { rateLimit } from "../../../lib/auth/rateLimit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, sessionTtlSeconds } from "../../../lib/auth/session";
import { verifyTurnstile } from "../../../lib/auth/turnstile";

export interface LoginResult {
  error?: string;
}

// ইচ্ছাকৃতভাবে generic — ইমেইল ভুল নাকি পাসওয়ার্ড, কোনো হিন্ট নেই (Mehediadmin-এর মতো)
const GENERIC_ERROR = "ভুল ইমেইল বা পাসওয়ার্ড।";
const RATE_LIMITED_ERROR = "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
const CAPTCHA_ERROR = "যাচাই সম্পন্ন হয়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।";

/**
 * Supabase Auth (হাবের নিজস্ব Supabase প্রজেক্ট) দিয়ে ইমেইল+পাসওয়ার্ড যাচাই।
 * ১. প্রতি IP-তে ১০ মিনিটে ৫ বার + সব মিলিয়ে ঘণ্টায় ৪০ বার (ডাটাবেজে গোনা — Worker-এ মেমরি টেকে না)
 * ২. Turnstile (TURNSTILE_SECRET_KEY বসালে)
 * ৩. Supabase password grant → ইমেইল অবশ্যই HUB_ADMIN_EMAIL-এর সমান — অন্য কোনো Supabase ইউজার ঢুকতে পারবে না
 * ৪. সফল হলে সই করা সেশন কুকি (httpOnly, Secure, SameSite=Lax) — Supabase-এর টোকেন আমরা রাখি না
 */
export async function hubLogin(email: string, password: string, turnstileToken: string): Promise<LoginResult> {
  const h = await headers();
  const ip = clientIp(h);
  const userAgent = (h.get("user-agent") || "").slice(0, 300);

  const [ipOk, globalOk] = await Promise.all([rateLimit(`login:ip:${ip}`, 5, 600), rateLimit("login:all", 40, 3600)]);
  if (!ipOk || !globalOk) {
    await writeAudit("login.rate_limited", null, { ip }, "anonymous");
    return { error: RATE_LIMITED_ERROR };
  }

  if (!(await verifyTurnstile(turnstileToken))) return { error: CAPTCHA_ERROR };

  const adminEmail = (process.env.HUB_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? "").trim();
  if (!adminEmail || !url || !anonKey) {
    console.error("hubLogin: HUB_ADMIN_EMAIL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ANON_KEY সেট করা নেই");
    return { error: "লগইন সেটআপ অসম্পূর্ণ। এনভায়রনমেন্ট ভ্যারিয়েবল যাচাই করুন।" };
  }

  const em = typeof email === "string" ? email.trim().toLowerCase().slice(0, 254) : "";
  const pw = typeof password === "string" ? password.slice(0, 200) : "";
  if (!em || !pw) return { error: GENERIC_ERROR };

  let authedEmail = "";
  let accessToken = "";
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password: pw }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string; user?: { email?: string } };
      authedEmail = (data.user?.email ?? "").toLowerCase();
      accessToken = data.access_token ?? "";
    }
  } catch (e) {
    console.error("hubLogin: Supabase Auth কল ব্যর্থ:", e);
  }

  // আমরা শুধু পরিচয় যাচাই করছিলাম — Supabase সেশন রাখার দরকার নেই, সাথে সাথে বাতিল (best-effort)
  if (accessToken) {
    void fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(4000),
    }).catch(() => {});
  }

  if (!authedEmail || authedEmail !== adminEmail) {
    await writeAudit("login.failed", null, { ip, ua: userAgent }, "anonymous");
    return { error: GENERIC_ERROR };
  }

  const token = await createSessionToken("pw");
  (await cookies()).set(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge: sessionTtlSeconds() });
  await writeAudit("login.ok", null, { ip, method: "pw" });
  after(async () => {
    await sendHubLoginAlert({ ip, userAgent, method: "pw" });
  });

  redirect("/");
}
