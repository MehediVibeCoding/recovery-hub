"use server";

import { revalidatePath } from "next/cache";
import { normalizeBdPhone } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import { writeAudit } from "../../lib/audit";
import { sanitizeInput } from "../../lib/security";
import { AGENT_CONFIG_KEY, type AgentConfig } from "../../lib/data/agent";
import type { ActionResult } from "../../lib/types";

export async function saveAgentConfig(input: AgentConfig): Promise<ActionResult> {
  const delay = Number(input.delay_minutes);
  const cap = Number(input.daily_cap);
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!Number.isInteger(delay) || delay < 5 || delay > 1440) return { ok: false, error: "অপেক্ষার সময়: ৫ থেকে ১৪৪০ মিনিটের মধ্যে পূর্ণসংখ্যা দিন" };
  if (!Number.isInteger(cap) || cap < 1 || cap > 5000) return { ok: false, error: "দৈনিক সীমা: ১ থেকে ৫০০০-এর মধ্যে পূর্ণসংখ্যা দিন" };
  if (!hhmm.test(input.quiet_start) || !hhmm.test(input.quiet_end)) return { ok: false, error: "কোয়াইট আওয়ার্সের সময় ঠিক নেই" };

  const value: AgentConfig = {
    enabled: input.enabled === true,
    delay_minutes: delay,
    quiet_start: input.quiet_start,
    quiet_end: input.quiet_end,
    daily_cap: cap,
  };
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: AGENT_CONFIG_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  await writeAudit("agent.config", AGENT_CONFIG_KEY, value as unknown as Record<string, unknown>);
  revalidatePath("/sms-agent");
  return { ok: true };
}

export async function addDncContact(phoneInput: string, noteInput: string): Promise<ActionResult> {
  const phone = normalizeBdPhone(sanitizeInput(phoneInput, 32));
  if (!phone) return { ok: false, error: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)" };
  const note = sanitizeInput(noteInput, 200);
  const supabase = getSupabaseServiceClient();
  const patch: Record<string, unknown> = { phone, do_not_contact: true, opted_out_at: new Date().toISOString() };
  if (note) patch.note = note;
  const { error } = await supabase.from("contacts").upsert(patch, { onConflict: "phone" });
  if (error) return { ok: false, error: error.message };
  await writeAudit("contact.dnc_on", phone);
  revalidatePath("/sms-agent");
  return { ok: true };
}

export async function removeDncContact(phone: string): Promise<ActionResult> {
  const p = normalizeBdPhone(sanitizeInput(phone, 32));
  if (!p) return { ok: false, error: "অবৈধ নম্বর" };
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("contacts")
    .update({ do_not_contact: false, opted_out_at: null })
    .eq("phone", p);
  if (error) return { ok: false, error: error.message };
  await writeAudit("contact.dnc_off", p);
  revalidatePath("/sms-agent");
  return { ok: true };
}
