import "server-only";

/** ক্লায়েন্ট IP — Cloudflare-এর cf-connecting-ip সবার আগে (ক্লায়েন্ট নকল করতে পারে না) */
export function clientIp(h: Headers): string {
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim().slice(0, 64);
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return h.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}
