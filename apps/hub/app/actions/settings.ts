"use server";

import { revalidatePath } from "next/cache";
import { normalizeBdPhone } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import { writeAudit } from "../../lib/audit";
import { isUuid, sanitizeInput } from "../../lib/security";
import { RULE_DEFS, validateRuleParams, validateWeights, type WeightsInput } from "../../lib/rules";
import type { ActionResult } from "../../lib/types";
import { requireSession } from "../../lib/auth/guard";

async function upsertSetting(key: string, value: unknown): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? error.message : null;
}

export async function saveRule(key: string, enabled: boolean, params: Record<string, unknown>): Promise<ActionResult> {
  await requireSession();
  if (!(key in RULE_DEFS)) return { ok: false, error: "অজানা রুল" };
  const v = validateRuleParams(key, params);
  if (!v.ok) return { ok: false, error: v.error };
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("hub_rules")
    .update({ enabled: enabled === true, params: v.params, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  await writeAudit("rule.update", key, { enabled, params: v.params });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveWeights(input: WeightsInput): Promise<ActionResult> {
  await requireSession();
  const v = validateWeights(input);
  if (!v.ok) return { ok: false, error: v.error };
  const err = await upsertSetting("priority.weights", v.value);
  if (err) return { ok: false, error: err };
  await writeAudit("settings.weights", "priority.weights", v.value as unknown as Record<string, unknown>);
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveStoreSettings(storeName: string, locale: string): Promise<ActionResult> {
  await requireSession();
  const name = sanitizeInput(storeName, 60);
  if (!name) return { ok: false, error: "স্টোরের নাম দিন" };
  if (locale !== "bn" && locale !== "en") return { ok: false, error: "অবৈধ ভাষা" };
  const e1 = await upsertSetting("store.name", name);
  if (e1) return { ok: false, error: e1 };
  const e2 = await upsertSetting("locale.default", locale);
  if (e2) return { ok: false, error: e2 };
  await writeAudit("settings.store", "store.name", { name, locale });
  revalidatePath("/settings");
  revalidatePath("/templates");
  return { ok: true };
}

const KINDS = ["phone", "email", "ip_hash", "name_word", "address_word"] as const;

export async function addListEntry(kind: string, valueInput: string, list: string, reasonInput: string): Promise<ActionResult> {
  await requireSession();
  if (!KINDS.includes(kind as (typeof KINDS)[number])) return { ok: false, error: "অবৈধ ধরন" };
  if (list !== "allow" && list !== "block") return { ok: false, error: "অবৈধ তালিকা" };
  let value = sanitizeInput(valueInput, 200);
  if (!value) return { ok: false, error: "মান দিন" };

  if (kind === "phone") {
    const p = normalizeBdPhone(value);
    if (!p) return { ok: false, error: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)" };
    value = p;
  } else if (kind === "email") {
    value = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false, error: "সঠিক ইমেইল দিন" };
  } else {
    value = value.toLowerCase();
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("list_entries").insert({
    kind,
    value,
    list,
    reason: sanitizeInput(reasonInput, 200) || null,
    created_by: "admin",
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "এই এন্ট্রি আগে থেকেই আছে" };
    return { ok: false, error: error.message };
  }
  await writeAudit(list === "block" ? "blocklist.add" : "allowlist.add", value, { kind });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeListEntry(id: string): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("list_entries").delete().eq("id", id).select("kind,value,list").maybeSingle();
  if (error) return { ok: false, error: error.message };
  await writeAudit("list_entry.remove", data?.value ?? id, { kind: data?.kind, list: data?.list });
  revalidatePath("/settings");
  return { ok: true };
}

export async function setApiKeyActive(id: string, active: boolean): Promise<ActionResult> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .update({ is_active: active === true })
    .eq("id", id)
    .select("name,key_prefix")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  await writeAudit(active ? "api_key.enable" : "api_key.disable", data?.key_prefix ?? id, { name: data?.name });
  revalidatePath("/settings");
  revalidatePath("/sms-agent");
  return { ok: true };
}
