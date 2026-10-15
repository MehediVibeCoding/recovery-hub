import "server-only";
import { NextResponse } from "next/server";
import { StockRestockIngestSchema } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { checkIngestAuth } from "../../../../lib/ingestAuth";
import { writeAudit } from "../../../../lib/audit";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * অ্যাডমিন প্যানেল (Mehediadmin) যখন কোনো প্রোডাক্টের স্টক ০ থেকে বাড়ায়, এখানে সিগন্যাল পাঠায়।
 * ওই প্রোডাক্টের সব pending স্টক-রিকোয়েস্টে restocked_at বসে — হাবের /stock পেজে "জানাতে হবে" হিসেবে দেখায়।
 * কোনো মেসেজ নিজে থেকে যায় না (অটো-নোটিফিকেশন বন্ধ)।
 */
export async function POST(req: Request) {
  const auth = await checkIngestAuth(req);
  if (!auth.ok) return errorResponse(auth.status, auth.code, auth.message);

  let json: unknown;
  try {
    json = JSON.parse(auth.rawBody);
  } catch {
    return errorResponse(422, "validation", "body is not valid JSON");
  }
  const parsed = StockRestockIngestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(422, "validation", parsed.error.issues[0]?.message ?? "invalid payload");
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("hub_mark_restocked", {
    p_product_id: parsed.data.product_id,
    p_stock: parsed.data.stock,
  });
  if (error) return errorResponse(422, "db_error", error.message);

  const matched = typeof data === "number" ? data : 0;
  if (matched > 0) {
    await writeAudit("stock.restocked", parsed.data.product_id, { matched, stock: parsed.data.stock }, "ingest");
  }
  return NextResponse.json({ matched });
}
