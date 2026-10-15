import "server-only";
import { NextResponse, after } from "next/server";
import { writeAudit } from "../../../lib/audit";
import { sendHubLoginAlert } from "../../../lib/auth/alert";
import { clientIp } from "../../../lib/auth/request";
import { consumeNonce, rateLimit } from "../../../lib/auth/rateLimit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, sessionTtlSeconds } from "../../../lib/auth/session";
import { verifyToken } from "../../../lib/auth/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SsoPayload {
  v: 1;
  iss: string;
  iat: number;
  exp: number;
  nonce: string;
}

function deny(): NextResponse {
  // ভুল/মেয়াদোত্তীর্ণ/ব্যবহৃত টোকেন — হাবের অস্তিত্ব ফাঁস না করতে সাধারণ 404
  return new NextResponse("404 Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}

/**
 * অ্যাডমিন প্যানেল (Mehediadmin) → হাব, এক ক্লিকে প্রবেশ।
 * অ্যাডমিন প্যানেল লগইন-করা অ্যাডমিনের জন্য ৬০ সেকেন্ডের সই করা টোকেন বানিয়ে এখানে পাঠায়।
 * এখানে: সই (HUB_SSO_SECRET) + মেয়াদ + issuer + এক-বারের-nonce যাচাই → সেশন কুকি → হোমে রিডাইরেক্ট।
 */
export async function GET(req: Request) {
  const h = req.headers;
  const ip = clientIp(h);
  if (!(await rateLimit(`sso:ip:${ip}`, 20, 600))) return deny();

  const secret = (process.env.HUB_SSO_SECRET ?? "").trim();
  if (secret.length < 32) return deny();

  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const payload = await verifyToken<SsoPayload>(token, secret);
  if (!payload || payload.v !== 1 || payload.iss !== "mehediadmin") return deny();

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat !== "number" || payload.iat > now + 30 || payload.exp - payload.iat > 180) return deny();
  if (typeof payload.nonce !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(payload.nonce)) return deny();

  if (!(await consumeNonce(payload.nonce))) return deny(); // replay

  const session = await createSessionToken("sso");
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, session, { ...sessionCookieOptions, maxAge: sessionTtlSeconds() });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");

  const userAgent = (h.get("user-agent") || "").slice(0, 300);
  after(async () => {
    await writeAudit("login.ok", null, { ip, method: "sso" });
    await sendHubLoginAlert({ ip, userAgent, method: "sso" });
  });
  return res;
}
