import "server-only";
import { NextResponse } from "next/server";
import { StockRequestIngestSchema, normalizeBdPhone } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { checkIngestAuth } from "../../../../lib/ingestAuth";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const auth = await checkIngestAuth(req);
  if (!auth.ok) {
    return errorResponse(auth.status, auth.code, auth.message);
  }

  let json: unknown;
  try {
    json = JSON.parse(auth.rawBody);
  } catch {
    return errorResponse(422, "validation", "body is not valid JSON");
  }

  const parsed = StockRequestIngestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(422, "validation", parsed.error.issues[0]?.message ?? "invalid payload");
  }
  const reqBody = parsed.data;
  const phoneNormalized = normalizeBdPhone(reqBody.phone) || reqBody.phone;
  const supabase = getSupabaseServiceClient();

  const { data: saved, error } = await supabase
    .from("stock_requests")
    .upsert(
      {
        product_id: reqBody.product_id,
        product_name: reqBody.product_name,
        customer_name: reqBody.customer_name,
        phone: phoneNormalized,
        status: "pending",
        // আবার নতুন করে অনুরোধ করলে আগের "স্টকে ফিরেছে" চিহ্ন মুছে নতুন করে অপেক্ষা শুরু
        restocked_at: null,
        restocked_stock: null,
        notified_at: null,
      },
      { onConflict: "product_id,phone" }
    )
    .select("id")
    .single();

  if (error || !saved) {
    return errorResponse(422, "db_error", error?.message ?? "could not save stock request");
  }

  return NextResponse.json({ id: saved.id });
}
