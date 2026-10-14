import "server-only";
import { NextResponse } from "next/server";
import { OrderIngestSchema, normalizeBdPhone } from "@recovery-hub/shared";
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

  const parsed = OrderIngestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(422, "validation", parsed.error.issues[0]?.message ?? "invalid payload");
  }
  const order = parsed.data;
  const phoneNormalized = normalizeBdPhone(order.phone);
  const supabase = getSupabaseServiceClient();

  const { data: saved, error } = await supabase
    .from("orders_backup")
    .upsert(
      {
        external_order_id: order.external_order_id,
        session_id: order.session_id,
        customer_name: order.customer_name,
        phone: phoneNormalized,
        email: order.email,
        address: order.address,
        district: order.district,
        items: order.items ?? [],
        subtotal: order.subtotal,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        order_created_at: order.order_created_at,
        raw_payload: order.raw ?? {},
      },
      { onConflict: "external_order_id" }
    )
    .select("id")
    .single();

  if (error || !saved) {
    return errorResponse(422, "db_error", error?.message ?? "could not save order");
  }

  let matchedDraftId: string | null = null;
  if (phoneNormalized || order.session_id) {
    const { data } = await supabase.rpc("match_order_to_draft", {
      p_phone: phoneNormalized,
      p_order_id: order.external_order_id,
      p_session: order.session_id ?? null,
    });
    matchedDraftId = (data as string | null) ?? null;
  }

  // Keep `contacts` in sync so the draft engine's history module has data
  // for this phone on the next checkout.
  if (phoneNormalized) {
    const delta =
      order.order_status === "delivered"
        ? { delivered_count: 1 }
        : order.order_status === "returned"
          ? { returned_count: 1 }
          : order.order_status === "cancelled"
            ? { cancelled_count: 1 }
            : null;
    if (delta) {
      await supabase.rpc("increment_contact_counts", {
        p_phone: phoneNormalized,
        p_delivered: delta.delivered_count ?? 0,
        p_returned: delta.returned_count ?? 0,
        p_cancelled: delta.cancelled_count ?? 0,
      });
    }
  }

  return NextResponse.json({ id: saved.id, matched_draft_id: matchedDraftId });
}
