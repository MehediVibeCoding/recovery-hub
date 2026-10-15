"use server";

import { revalidatePath } from "next/cache";
import { normalizeBdPhone } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import { ADMIN_ACTOR, writeAudit } from "../../lib/audit";
import { isUuid, sanitizeInput } from "../../lib/security";
import { getDraftDetail, type DraftDetail } from "../../lib/data/drafts";
import type { ActionResult, DraftStatus } from "../../lib/types";
import { requireSession } from "../../lib/auth/guard";

const STATUSES: DraftStatus[] = ["draft", "contacted", "recovered", "lost", "invalid", "junk"];

async function addEvent(draftId: string, type: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("draft_events")
    .insert({ draft_id: draftId, type, actor: ADMIN_ACTOR, payload });
  if (error) console.error("draft_events insert failed:", error.message);
}

export async function loadDraftDetail(id: string): Promise<ActionResult<DraftDetail>> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  try {
    const detail = await getDraftDetail(id);
    if (!detail) return { ok: false, error: "ড্রাফট পাওয়া যায়নি" };
    return { ok: true, data: detail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "লোড করা যায়নি" };
  }
}

export async function setDraftStatus(id: string, status: string): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  if (!STATUSES.includes(status as DraftStatus)) return { ok: false, error: "অবৈধ স্ট্যাটাস" };
  const supabase = getSupabaseServiceClient();

  const { data: before, error: readErr } = await supabase
    .from("checkout_drafts")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!before) return { ok: false, error: "ড্রাফট পাওয়া যায়নি" };

  const patch: Record<string, unknown> = { status };
  // ম্যানুয়ালি "recovered" করলে সময়টা বসে; অন্য স্ট্যাটাসে ফিরলে recovered চিহ্ন মুছে যায়
  if (status === "recovered") patch.recovered_at = new Date().toISOString();
  else if (before.status === "recovered") {
    patch.recovered_at = null;
    patch.recovered_order_id = null;
  }

  const { error } = await supabase.from("checkout_drafts").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await addEvent(id, "status", { from: before.status, to: status });
  await writeAudit("draft.status", id, { from: before.status, to: status });
  revalidatePath("/drafts");
  revalidatePath("/");
  return { ok: true };
}

export async function saveDraftNote(id: string, note: string): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  const clean = sanitizeInput(note, 1000);
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("checkout_drafts")
    .update({ admin_note: clean || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await addEvent(id, "note", { length: clean.length });
  await writeAudit("draft.note", id);
  revalidatePath("/drafts");
  return { ok: true };
}

/** Do-not-contact — ড্রাফটে ফ্ল্যাগ + (নম্বর থাকলে) contacts টেবিলেও, যাতে ভবিষ্যতের সব ড্রাফটে প্রযোজ্য হয় */
export async function setDraftDnc(id: string, value: boolean): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  const supabase = getSupabaseServiceClient();
  const { data: d, error: readErr } = await supabase
    .from("checkout_drafts")
    .select("phone")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!d) return { ok: false, error: "ড্রাফট পাওয়া যায়নি" };

  const { error } = await supabase.from("checkout_drafts").update({ do_not_contact: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (d.phone) {
    const { error: cErr } = await supabase.from("contacts").upsert(
      { phone: d.phone, do_not_contact: value, opted_out_at: value ? new Date().toISOString() : null },
      { onConflict: "phone" }
    );
    if (cErr) return { ok: false, error: cErr.message };
  }

  await addEvent(id, "status", { do_not_contact: value });
  await writeAudit(value ? "draft.dnc_on" : "draft.dnc_off", id, { phone: d.phone });
  revalidatePath("/drafts");
  revalidatePath("/sms-agent");
  return { ok: true };
}

/** নম্বর ব্লকলিস্টে তোলা + ড্রাফট Junk করা */
export async function blockDraftPhone(id: string): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  const supabase = getSupabaseServiceClient();
  const { data: d, error: readErr } = await supabase
    .from("checkout_drafts")
    .select("phone,rule_flags")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!d) return { ok: false, error: "ড্রাফট পাওয়া যায়নি" };
  const phone = normalizeBdPhone(d.phone ?? undefined);
  if (!phone) return { ok: false, error: "এই ড্রাফটে বৈধ ফোন নম্বর নেই" };

  const { error: lErr } = await supabase
    .from("list_entries")
    .upsert(
      { kind: "phone", value: phone, list: "block", reason: "Drafts Inbox থেকে ব্লক", created_by: ADMIN_ACTOR },
      { onConflict: "kind,value,list", ignoreDuplicates: true }
    );
  if (lErr) return { ok: false, error: lErr.message };

  const flags = Array.from(new Set([...(d.rule_flags ?? []), "blocklisted"]));
  const { error } = await supabase
    .from("checkout_drafts")
    .update({ status: "junk", bucket: "junk", rule_flags: flags })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await addEvent(id, "status", { to: "junk", reason: "blocklisted" });
  await writeAudit("blocklist.add", phone, { via: "draft", draft_id: id });
  revalidatePath("/drafts");
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
