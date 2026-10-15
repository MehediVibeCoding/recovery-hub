"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import { writeAudit } from "../../lib/audit";
import { sanitizeInput } from "../../lib/security";
import { loadTemplates } from "../../lib/data/templates";
import { TEMPLATES_SETTING_KEY, type SmsTemplate } from "../../lib/templates";
import type { ActionResult } from "../../lib/types";
import { requireSession } from "../../lib/auth/guard";

const MAX_TEMPLATES = 20;

async function persist(items: SmsTemplate[]): Promise<ActionResult<SmsTemplate[]>> {
  const supabase = getSupabaseServiceClient();
  // একটাই ডিফল্ট; ডিফল্ট সবসময় চালু
  let seenDefault = false;
  const fixed = items.map((t) => {
    const isDef = t.is_default && !seenDefault;
    if (isDef) seenDefault = true;
    return { ...t, is_default: isDef, enabled: isDef ? true : t.enabled };
  });
  if (!seenDefault && fixed.length > 0) fixed[0] = { ...fixed[0], is_default: true, enabled: true };

  const { error } = await supabase
    .from("settings")
    .upsert({ key: TEMPLATES_SETTING_KEY, value: { items: fixed }, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/templates");
  return { ok: true, data: fixed };
}

export async function upsertTemplate(input: {
  id?: string;
  name: string;
  body: string;
  enabled: boolean;
  is_default: boolean;
}): Promise<ActionResult<SmsTemplate[]>> {
  await requireSession();
  const name = sanitizeInput(input.name, 60);
  const body = sanitizeInput(input.body, 600);
  if (!name) return { ok: false, error: "টেমপ্লেটের নাম দিন" };
  if (!body) return { ok: false, error: "মেসেজের লেখা দিন" };

  try {
    const { items } = await loadTemplates();
    const now = new Date().toISOString();
    let next: SmsTemplate[];
    const existing = input.id ? items.find((t) => t.id === input.id) : undefined;

    if (existing) {
      next = items.map((t) =>
        t.id === existing.id ? { ...t, name, body, enabled: input.enabled, is_default: input.is_default, updated_at: now } : t
      );
    } else {
      if (items.length >= MAX_TEMPLATES) return { ok: false, error: `সর্বোচ্চ ${MAX_TEMPLATES}টি টেমপ্লেট রাখা যায়` };
      const id = "tpl_" + crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      next = [...items, { id, name, body, enabled: input.enabled, is_default: input.is_default, updated_at: now }];
    }
    // নতুন ডিফল্ট বসালে বাকিগুলো থেকে ডিফল্ট সরে যায়
    if (input.is_default) {
      const targetId = existing?.id ?? next[next.length - 1].id;
      next = next.map((t) => ({ ...t, is_default: t.id === targetId }));
    }
    const res = await persist(next);
    if (res.ok) await writeAudit(existing ? "template.update" : "template.create", existing?.id ?? null, { name });
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "সেভ করা যায়নি" };
  }
}

export async function deleteTemplate(id: string): Promise<ActionResult<SmsTemplate[]>> {
  await requireSession();
  try {
    const { items } = await loadTemplates();
    const target = items.find((t) => t.id === id);
    if (!target) return { ok: false, error: "টেমপ্লেট পাওয়া যায়নি" };
    if (items.length <= 1) return { ok: false, error: "অন্তত একটা টেমপ্লেট রাখতে হবে" };
    const res = await persist(items.filter((t) => t.id !== id));
    if (res.ok) await writeAudit("template.delete", id, { name: target.name });
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "মুছতে পারেনি" };
  }
}

export async function setTemplateEnabled(id: string, enabled: boolean): Promise<ActionResult<SmsTemplate[]>> {
  await requireSession();
  try {
    const { items } = await loadTemplates();
    const target = items.find((t) => t.id === id);
    if (!target) return { ok: false, error: "টেমপ্লেট পাওয়া যায়নি" };
    if (target.is_default && !enabled) return { ok: false, error: "ডিফল্ট টেমপ্লেট বন্ধ করা যায় না — আগে অন্যটা ডিফল্ট করুন" };
    const res = await persist(items.map((t) => (t.id === id ? { ...t, enabled, updated_at: new Date().toISOString() } : t)));
    if (res.ok) await writeAudit(enabled ? "template.enable" : "template.disable", id, { name: target.name });
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "সেভ করা যায়নি" };
  }
}
