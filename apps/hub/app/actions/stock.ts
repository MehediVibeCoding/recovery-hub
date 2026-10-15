"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import { writeAudit } from "../../lib/audit";
import { isUuid, sanitizeInput } from "../../lib/security";
import { requireSession } from "../../lib/auth/guard";
import type { ActionResult } from "../../lib/types";

const SETTABLE = ["pending", "notified", "cancelled"] as const;
type Settable = (typeof SETTABLE)[number];

function refresh() {
  revalidatePath("/stock");
  revalidatePath("/");
}

/** একটা রিকোয়েস্টের স্ট্যাটাস বদল — notified = গ্রাহককে জানানো হয়েছে (নিজে ফোন/SMS করার পর) */
export async function setStockRequestStatus(id: string, status: string): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  if (!SETTABLE.includes(status as Settable)) return { ok: false, error: "অবৈধ স্ট্যাটাস" };
  const supabase = getSupabaseServiceClient();

  const patch: Record<string, unknown> = { status };
  patch.notified_at = status === "notified" ? new Date().toISOString() : null;

  const { error } = await supabase.from("stock_requests").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await writeAudit("stock.status", id, { to: status });
  refresh();
  return { ok: true };
}

/** একটা প্রোডাক্টে স্টকে-ফেরা সব pending রিকোয়েস্ট একসাথে "জানানো হয়েছে" */
export async function markProductNotified(productId: string): Promise<ActionResult<{ count: number }>> {
  await requireSession();
  const pid = sanitizeInput(productId, 100);
  if (!pid) return { ok: false, error: "প্রোডাক্ট আইডি নেই" };
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("stock_requests")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("product_id", pid)
    .eq("status", "pending")
    .not("restocked_at", "is", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  const count = data?.length ?? 0;
  await writeAudit("stock.bulk_notified", pid, { count });
  refresh();
  return { ok: true, data: { count } };
}

export async function deleteStockRequest(id: string): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("stock_requests").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await writeAudit("stock.delete", id);
  refresh();
  return { ok: true };
}
