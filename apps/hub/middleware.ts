import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE, sessionSecret } from "./lib/auth/session";

/**
 * হাবের প্রবেশদ্বার (middleware) — "যার সেশন নেই, সে কিছুই দেখে না"।
 *
 *  • বৈধ সেশন কুকি থাকলে → ঢুকতে দেয় (কুকি দেয় শুধু: ১. অ্যাডমিন প্যানেলের SSO, ২. গোপন লগইন পেজ)।
 *  • সেশন না থাকলে → প্রতিটা URL-এ সাধারণ 404, কোনো লগইন বক্স/401/হিন্ট নেই। হাব যে আছে, বাইরে থেকে বোঝা যায় না।
 *  • ব্যতিক্রম ১: HUB_LOGIN_PATH-এর গোপন পাথ (ইমেইল+পাসওয়ার্ড লগইন, Supabase Auth) — জরুরি প্রবেশপথ।
 *  • ব্যতিক্রম ২: /api/sso (সই করা টোকেন নিজেই যাচাই হয়; ভুল হলে সেটাও 404)।
 *  • /api/ingest/* এখানে আসেই না (matcher-এ বাদ) — মূল সাইটের HMAC-সই করা রিকোয়েস্ট, নিজস্ব গেট।
 *
 * এটা প্রথম স্তর। দ্বিতীয় স্তর: ডাটা-লেয়ার (lib/data), সব সার্ভার অ্যাকশন ও API রুট নিজে সেশন যাচাই করে (lib/auth/guard.ts)।
 */
export const config = {
  matcher: ["/((?!api/ingest|_next/static|_next/image|favicon.ico|vangcur-logo.png|vangcur-mark.png).*)"],
};

function hardened(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return res;
}

function notFound(): NextResponse {
  return hardened(
    new NextResponse("404 Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
  );
}

function loginPathFromEnv(): string | null {
  const slug = (process.env.HUB_LOGIN_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
  // অন্তত ১২ অক্ষরের লম্বা র‍্যান্ডম স্লাগ — ছোট/অনুমানযোগ্য হলে গোপন পথ বন্ধ থাকে
  return /^[A-Za-z0-9_-]{12,80}$/.test(slug) ? `/${slug}` : null;
}

export async function middleware(req: NextRequest) {
  if (!sessionSecret()) {
    // কনফিগারেশন ভুল — মালিককে জানানোর জন্য একমাত্র জায়গা যেখানে 404 নয়
    return hardened(
      new NextResponse("Recovery Hub বন্ধ আছে: HUB_SESSION_SECRET (কমপক্ষে ৩২ অক্ষর) সেট করা হয়নি।", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );
  }

  const { pathname } = req.nextUrl;

  // SSO: টোকেন যাচাই রুটের ভেতরে হয়
  if (pathname === "/api/sso") return hardened(NextResponse.next());

  const loginPath = loginPathFromEnv();
  const session = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (session) {
    if (pathname === "/hub-login" || (loginPath && pathname === loginPath)) {
      return hardened(NextResponse.redirect(new URL("/", req.url)));
    }
    return hardened(NextResponse.next());
  }

  if (loginPath && pathname === loginPath) {
    return hardened(NextResponse.rewrite(new URL("/hub-login", req.url)));
  }

  return notFound();
}
