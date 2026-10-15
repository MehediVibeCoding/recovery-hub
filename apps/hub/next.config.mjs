/**
 * সিকিউরিটি হেডার — হাব Cloudflare Worker-এ চলে, তাই সব রেসপন্সে (পেজ, API, স্ট্যাটিক) এগুলো বসে।
 * (middleware নিজের তৈরি 404/রিডাইরেক্টেও একই মূল হেডার বসায় — middleware.ts দেখুন)
 *
 * CSP নোট: Next.js হাইড্রেশনের ইনলাইন স্ক্রিপ্টের জন্য script-src-এ 'unsafe-inline' লাগে।
 * Turnstile (লগইন পেজের bot-যাচাই) এর জন্য challenges.cloudflare.com স্ক্রিপ্ট ও ফ্রেম অনুমোদিত।
 * ফন্ট build-time-এ self-host হয় (next/font) — তাই font-src শুধু 'self'।
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@recovery-hub/shared", "@recovery-hub/engine-drafts"],
  // "X-Powered-By: Next.js" হেডার বন্ধ — কী দিয়ে বানানো তা না জানানোই ভালো
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
