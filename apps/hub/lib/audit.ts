import "server-only";
import { getSupabaseServiceClient } from "./supabase/server";

/**
 * Phase 2-এ SSO আসার আগে অ্যাডমিন একজনই (Basic-auth গেট) — actor = "admin"।
 * অডিট লগ লিখতে ব্যর্থ হলে মূল অ্যাকশন আটকায় না, শুধু কনসোলে এরর।
 */
export const ADMIN_ACTOR = "admin";

export async function writeAudit(action: string, target: string | null, detail?: Record<string, unknown>) {
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("audit_log")
      .insert({ actor: ADMIN_ACTOR, action, target, detail: detail ?? null });
    if (error) console.error("audit_log insert failed:", error.message);
  } catch (e) {
    console.error("audit_log insert threw:", e);
  }
}
