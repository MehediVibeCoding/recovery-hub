import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth/guard";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

// এই পেজ শুধু middleware-এর গোপন পাথ (HUB_LOGIN_PATH) rewrite করলেই পৌঁছায়;
// অন্য কোনোভাবে /hub-login খুললে middleware 404 দেয়।
export default async function HubLoginPage() {
  if (await getSession()) redirect("/");
  // রানটাইমে পড়া হয় (build-time inline নয়) — Cloudflare-এ পরে বদলালেও কাজ করে
  const turnstileSiteKey = (process.env.TURNSTILE_SITE_KEY ?? "").trim();
  return <LoginForm turnstileSiteKey={turnstileSiteKey} />;
}
