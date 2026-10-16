import "server-only";
import { NextResponse } from "next/server";
import {
  DraftIngestSchema,
  normalizeBdPhone,
  applyRuleLayer,
  computePriority,
} from "@recovery-hub/shared";
import { scoreDraft, ENGINE_VERSION } from "@recovery-hub/engine-drafts";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { checkIngestAuth } from "../../../../lib/ingestAuth";
import { loadScoringConfig } from "../../../../lib/hubConfig";

export const runtime = "nodejs";

function trustLevel(score: number): "green" | "yellow" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

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

  const parsed = DraftIngestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(422, "validation", parsed.error.issues[0]?.message ?? "invalid payload");
  }
  const draft = parsed.data;

  const supabase = getSupabaseServiceClient();

  // Merge-safe: আগের ড্রাফট আগে আনা হয়, যাতে এই রিকোয়েস্টে কোনো ফিল্ড (যেমন ঠিকানা) না এলেও
  // স্কোর আগে-জমা-হওয়া তথ্য নিয়েই হয় — আংশিক আপডেটে স্কোর ভুলভাবে কমে/বাড়ে না।
  const { data: existing } = await supabase
    .from("checkout_drafts")
    .select("id, customer_name, phone, phone_raw, email, address, district, upazila, notes, cart_total")
    .eq("session_id", draft.session_id)
    .maybeSingle();

  const phoneNormalized = normalizeBdPhone(draft.phone) || existing?.phone || null;
  const effective = {
    name: draft.customer_name || existing?.customer_name || undefined,
    email: draft.email || existing?.email || undefined,
    address: draft.address || existing?.address || undefined,
    district: draft.district || existing?.district || undefined,
    cartTotal: draft.cart_total ?? (existing?.cart_total != null ? Number(existing.cart_total) : undefined),
  };

  // list_entries (blocklist/allowlist) + contacts (history/courier) lookups.
  const [blockRes, allowRes, contactRes] = await Promise.all([
    phoneNormalized
      ? supabase
          .from("list_entries")
          .select("id")
          .eq("kind", "phone")
          .eq("value", phoneNormalized)
          .eq("list", "block")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    phoneNormalized
      ? supabase
          .from("list_entries")
          .select("id")
          .eq("kind", "phone")
          .eq("value", phoneNormalized)
          .eq("list", "allow")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    phoneNormalized
      ? supabase
          .from("contacts")
          .select("delivered_count, returned_count, cancelled_count, courier_success, courier_total")
          .eq("phone", phoneNormalized)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const history = contactRes.data
    ? {
        delivered: contactRes.data.delivered_count,
        returned: contactRes.data.returned_count,
        cancelled: contactRes.data.cancelled_count,
      }
    : undefined;
  const courier =
    contactRes.data?.courier_success != null && contactRes.data?.courier_total != null
      ? { success: contactRes.data.courier_success, total: contactRes.data.courier_total }
      : undefined;

  const engineResult = scoreDraft({
    phoneRaw: phoneNormalized ?? undefined,
    name: effective.name,
    email: effective.email,
    address: effective.address,
    district: effective.district,
    cartTotal: effective.cartTotal,
    hourOfDay: draft.hour_of_day,
    history,
  });

  // Settings পেজে বদলানো রুল/ওয়েট (ব্যর্থ হলে ডিফল্ট)
  const scoring = await loadScoringConfig();

  const ruled = applyRuleLayer(
    {
      phoneNormalized: engineResult.phoneNormalized,
      score: engineResult.score,
      confidence: engineResult.confidence,
      blocklisted: Boolean(blockRes.data),
      allowlisted: Boolean(allowRes.data),
      history,
      courier,
      engineFlags: engineResult.flags,
      engineJunk: engineResult.hardJunk,
    },
    scoring.ruleParams
  );

  const priority = computePriority({
    bucket: ruled.bucket,
    trustScore: engineResult.score,
    confidence: engineResult.confidence,
    cartTotal: effective.cartTotal ?? 0,
    minutesSinceActivity: 0, // this request IS the activity
  }, scoring.weights);

  // Merge-safe upsert: an incoming empty/missing field never overwrites an
  // existing non-empty value. cart_* replaces as a whole when provided.
  const merged = {
    session_id: draft.session_id,
    customer_name: draft.customer_name || existing?.customer_name || null,
    phone: phoneNormalized,
    phone_raw: draft.phone || existing?.phone_raw || null,
    email: draft.email || existing?.email || null,
    address: draft.address || existing?.address || null,
    district: draft.district || existing?.district || null,
    upazila: draft.upazila || existing?.upazila || null,
    notes: draft.notes || existing?.notes || null,
    ...(draft.cart_items !== undefined || draft.cart_total !== undefined
      ? {
          cart_items: draft.cart_items ?? [],
          cart_total: draft.cart_total ?? 0,
        }
      : {}),
    currency: draft.currency ?? "BDT",
    utm_source: draft.utm?.source,
    utm_medium: draft.utm?.medium,
    utm_campaign: draft.utm?.campaign,
    landing_url: draft.landing_url,
    user_agent: draft.user_agent,
    hour_of_day: draft.hour_of_day,
    behavior: draft.behavior,
    trust_score: engineResult.score,
    trust_confidence: engineResult.confidence,
    trust_result: engineResult,
    engine_version: ENGINE_VERSION,
    rule_flags: ruled.flags,
    scored_at: new Date().toISOString(),
    bucket: ruled.bucket,
    priority,
    last_activity_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from("checkout_drafts")
    .upsert(merged, { onConflict: "session_id" })
    .select("id")
    .single();

  if (error || !saved) {
    return errorResponse(422, "db_error", error?.message ?? "could not save draft");
  }

  await supabase.from("draft_events").insert({
    draft_id: saved.id,
    type: existing ? "updated" : "created",
    actor: "system",
    payload: { bucket: ruled.bucket, flags: ruled.flags },
  });

  return NextResponse.json({
    id: saved.id,
    created: !existing,
    bucket: ruled.bucket,
    trust: {
      score: engineResult.score,
      level: trustLevel(engineResult.score),
      confidence: engineResult.confidence,
    },
  });
}
