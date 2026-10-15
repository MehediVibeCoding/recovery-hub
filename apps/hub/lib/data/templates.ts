import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import { DEFAULT_TEMPLATES, TEMPLATES_SETTING_KEY, type SmsTemplate } from "../templates";
import { fail } from "./util";
import { requireSession } from "../auth/guard";

/** সেভ করা কিছু না থাকলে স্টার্টার টেমপ্লেট দেখানো হয় (প্রথম সেভে ডাটাবেজে ঢোকে) */
export async function loadTemplates(): Promise<{ items: SmsTemplate[]; saved: boolean }> {
  await requireSession();
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("settings").select("value").eq("key", TEMPLATES_SETTING_KEY).maybeSingle();
  if (error) fail("টেমপ্লেট", error);
  const raw = data?.value as { items?: unknown } | undefined;
  if (!raw || !Array.isArray(raw.items)) return { items: DEFAULT_TEMPLATES, saved: false };
  return { items: raw.items as SmsTemplate[], saved: true };
}
