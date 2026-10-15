import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";

/**
 * ডাটাবেজ-ভিত্তিক রেট লিমিট (hub_rate_limit ফাংশন, migration 0003)।
 * Cloudflare Worker-এ ইনস্ট্যান্স-মেমরি ভরসাযোগ্য নয় (প্রতি রিকোয়েস্টে আলাদা isolate হতে পারে)।
 * true = অনুমোদিত। ডাটাবেজ এরর হলে নিরাপদ দিকে (false = আটকে দেওয়া)।
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("hub_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_sec: windowSec,
    });
    if (error) {
      console.error("hub_rate_limit failed:", error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("hub_rate_limit threw:", e);
    return false;
  }
}

/** SSO টোকেনের nonce একবারই ব্যবহার করা যাবে — replay বন্ধ। true = প্রথমবার */
export async function consumeNonce(nonce: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("hub_consume_nonce", { p_nonce: nonce });
    if (error) {
      console.error("hub_consume_nonce failed:", error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("hub_consume_nonce threw:", e);
    return false;
  }
}
