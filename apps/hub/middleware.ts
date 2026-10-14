import { NextRequest, NextResponse } from "next/server";

/**
 * অ্যাডমিন গেট (Phase 2-এ SSO আসার আগের সাময়িক সুরক্ষা)।
 *
 * এই সাইটে এখন আসল গ্রাহকের ফোন/ঠিকানা দেখা যায় আর ডাটা বদলানো যায় — তাই workers.dev
 * লিংক জানা যে কেউ ঢুকতে পারবে, এটা চলবে না। HTTP Basic Auth:
 *   HUB_ADMIN_USER (ডিফল্ট "admin") + HUB_ADMIN_PASSWORD (বাধ্যতামূলক)
 * HUB_ADMIN_PASSWORD সেট না থাকলে সাইট বন্ধ (fail-closed) — খোলা অবস্থায় ডাটা ফাঁস হওয়ার চেয়ে ভালো।
 *
 * /api/ingest/* এখানে বাদ — সেগুলো নিজস্ব HMAC সিগনেচারে সুরক্ষিত।
 */
export const config = {
  matcher: ["/((?!api/ingest|_next/static|_next/image|favicon.ico).*)"],
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  // পেস্ট করার সময় ঢুকে যাওয়া শুরু/শেষের স্পেস বা নতুন লাইন বাদ
  const password = (process.env.HUB_ADMIN_PASSWORD ?? "").trim();
  const user = (process.env.HUB_ADMIN_USER || "admin").trim();

  if (!password) {
    return new NextResponse(
      "Recovery Hub বন্ধ আছে: HUB_ADMIN_PASSWORD environment variable সেট করা হয়নি। (Cloudflare → Settings → Variables and Secrets)",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      // atob লাতিন-১ দেয়; ব্রাউজার UTF-8 পাঠায় (charset="UTF-8") — তাই বাইট থেকে UTF-8 ডিকোড
      const bin = atob(header.slice(6).trim());
      const decoded = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      const i = decoded.indexOf(":");
      const u = decoded.slice(0, i);
      const p = decoded.slice(i + 1);
      if (i >= 0 && timingSafeEqual(u, user) && timingSafeEqual(p, password)) {
        const res = NextResponse.next();
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    } catch {
      /* অবৈধ হেডার → নিচে 401 */
    }
  }

  return new NextResponse("লগইন প্রয়োজন", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Recovery Hub", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
