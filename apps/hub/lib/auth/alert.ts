import "server-only";

function esc(v: string): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * হাবে সফল লগইনের Telegram এলার্ট (ঐচ্ছিক) — Mehediadmin-এর মতোই। TELEGRAM_BOT_TOKEN ও
 * TELEGRAM_CHAT_ID না থাকলে চুপচাপ স্কিপ; লগইন কখনো এর ওপর নির্ভর করে না।
 */
export async function sendHubLoginAlert(info: { ip: string; userAgent: string; method: "pw" | "sso" }): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const now = new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
  const text =
    `<b>Recovery Hub-এ লগইন হয়েছে</b>\n` +
    `সময়: ${esc(now)}\n` +
    `উপায়: ${info.method === "sso" ? "অ্যাডমিন প্যানেল (SSO)" : "ইমেইল + পাসওয়ার্ড"}\n` +
    `IP: <code>${esc(info.ip)}</code>\n` +
    `ডিভাইস: ${esc(info.userAgent || "অজানা")}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* best-effort */
  }
}
