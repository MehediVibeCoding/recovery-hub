import "server-only";
import { getSupabaseServiceClient } from "./supabase/server";

/**
 * অ্যাডমিন একজনই (লগইন/SSO গেট) — actor = "admin"। লগইনের ব্যর্থ চেষ্টা/ingest-এর ব্যর্থতার জন্য আলাদা actor দেওয়া যায়।
 * অডিট লগ লিখতে ব্যর্থ হলে মূল অ্যাকশন আটকায় না, শুধু কনসোলে এরর।
 */
export const ADMIN_ACTOR = "admin";

export async function writeAudit(
  action: string,
  target: string | null,
  detail?: Record<string, unknown>,
  actor: string = ADMIN_ACTOR
) {
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("audit_log")
      .insert({ actor, action, target, detail: detail ?? null });
    if (error) console.error("audit_log insert failed:", error.message);
  } catch (e) {
    console.error("audit_log insert threw:", e);
  }
}
