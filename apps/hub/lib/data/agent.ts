import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import type { ContactRow, DraftRow } from "../types";
import { fail } from "./util";

export const AGENT_CONFIG_KEY = "agent.config";

export interface AgentConfig {
  enabled: boolean;
  delay_minutes: number;
  quiet_start: string; // HH:MM (Asia/Dhaka)
  quiet_end: string;
  daily_cap: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enabled: false,
  delay_minutes: 30,
  quiet_start: "22:00",
  quiet_end: "08:00",
  daily_cap: 100,
};

export function normalizeAgentConfig(raw: unknown): AgentConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const hhmm = (v: unknown, d: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
  const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    enabled: r.enabled === true,
    delay_minutes: n(r.delay_minutes, DEFAULT_AGENT_CONFIG.delay_minutes),
    quiet_start: hhmm(r.quiet_start, DEFAULT_AGENT_CONFIG.quiet_start),
    quiet_end: hhmm(r.quiet_end, DEFAULT_AGENT_CONFIG.quiet_end),
    daily_cap: n(r.daily_cap, DEFAULT_AGENT_CONFIG.daily_cap),
  };
}

export interface AgentKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface AgentPageData {
  config: AgentConfig;
  keys: AgentKeyRow[];
  state: "none" | "online" | "offline";
  lastSeen: string | null;
  queue: {
    eligibleNow: number;
    waiting: number;
    excludedDnc: number;
    preview: Pick<DraftRow, "id" | "customer_name" | "phone" | "cart_total" | "bucket" | "priority" | "last_activity_at">[];
  };
  dnc: ContactRow[];
  dncTotal: number;
}

export async function getAgentPage(): Promise<AgentPageData> {
  const supabase = getSupabaseServiceClient();
  const now = Date.now();

  const [cfgRes, keysRes, dncRes] = await Promise.all([
    supabase.from("settings").select("value").eq("key", AGENT_CONFIG_KEY).maybeSingle(),
    supabase
      .from("api_keys")
      .select("id,name,key_prefix,is_active,last_used_at,created_at")
      .eq("scope", "agent")
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("do_not_contact", true)
      .order("opted_out_at", { ascending: false, nullsFirst: false })
      .limit(50),
  ]);
  if (cfgRes.error) fail("এজেন্ট কনফিগ", cfgRes.error);
  if (keysRes.error) fail("এজেন্ট কী", keysRes.error);
  if (dncRes.error) fail("Do-not-contact তালিকা", dncRes.error);

  const config = normalizeAgentConfig(cfgRes.data?.value);
  const cutoff = new Date(now - config.delay_minutes * 60000).toISOString();

  // কিউ: status=draft, bucket high/medium, নম্বর আছে, DNC নয়
  const dncPhones = (dncRes.data ?? []).map((c) => c.phone).filter((p): p is string => /^\d{6,15}$/.test(p));
  const base = () => {
    let q = supabase
      .from("checkout_drafts")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .in("bucket", ["high", "medium"])
      .eq("do_not_contact", false)
      .not("phone", "is", null);
    if (dncPhones.length > 0) q = q.not("phone", "in", `(${dncPhones.join(",")})`);
    return q;
  };

  let previewQ = supabase
    .from("checkout_drafts")
    .select("id,customer_name,phone,cart_total,bucket,priority,last_activity_at")
    .eq("status", "draft")
    .in("bucket", ["high", "medium"])
    .eq("do_not_contact", false)
    .not("phone", "is", null)
    .lte("last_activity_at", cutoff);
  if (dncPhones.length > 0) previewQ = previewQ.not("phone", "in", `(${dncPhones.join(",")})`);

  const [eligRes, waitRes, excRes, prevRes] = await Promise.all([
    base().lte("last_activity_at", cutoff),
    base().gt("last_activity_at", cutoff),
    supabase
      .from("checkout_drafts")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .in("bucket", ["high", "medium"])
      .not("phone", "is", null)
      .or(dncPhones.length > 0 ? `do_not_contact.eq.true,phone.in.(${dncPhones.join(",")})` : "do_not_contact.eq.true"),
    previewQ.order("priority", { ascending: false, nullsFirst: false }).limit(8),
  ]);
  for (const [ctx, r] of [
    ["কিউ (প্রস্তুত)", eligRes],
    ["কিউ (অপেক্ষমাণ)", waitRes],
    ["কিউ (বাদ)", excRes],
    ["কিউ প্রিভিউ", prevRes],
  ] as const) {
    if (r.error) fail(ctx, r.error);
  }

  const keys = (keysRes.data ?? []) as AgentKeyRow[];
  const lastSeen =
    keys
      .filter((k) => k.is_active)
      .map((k) => k.last_used_at)
      .filter((v): v is string => Boolean(v))
      .sort()
      .pop() ?? null;
  const activeKeys = keys.filter((k) => k.is_active);
  const state: AgentPageData["state"] =
    activeKeys.length === 0 ? "none" : lastSeen && now - new Date(lastSeen).getTime() < 5 * 60000 ? "online" : "offline";

  return {
    config,
    keys,
    state,
    lastSeen,
    queue: {
      eligibleNow: eligRes.count ?? 0,
      waiting: waitRes.count ?? 0,
      excludedDnc: excRes.count ?? 0,
      preview: (prevRes.data ?? []) as AgentPageData["queue"]["preview"],
    },
    dnc: (dncRes.data ?? []) as ContactRow[],
    dncTotal: dncRes.count ?? 0,
  };
}
