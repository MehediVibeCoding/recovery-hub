import "server-only";
import { DEFAULT_PRIORITY_WEIGHTS } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "../supabase/server";
import { fail } from "./util";
import { requireSession } from "../auth/guard";

export interface RuleRow {
  id: string;
  key: string;
  enabled: boolean;
  params: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

export interface ListEntryRow {
  id: string;
  kind: "phone" | "email" | "ip_hash" | "name_word" | "address_word";
  value: string;
  list: "allow" | "block";
  reason: string | null;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  scope: "ingest" | "agent";
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface AuditRow {
  id: number;
  actor: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface SettingsPageData {
  rules: RuleRow[];
  weights: {
    trust: number;
    value: number;
    freshness: number;
    confidence: number;
    bucketBase: { high: number; medium: number };
  };
  storeName: string;
  locale: "bn" | "en";
  entries: ListEntryRow[];
  entriesTotal: number;
  keys: ApiKeyRow[];
  audit: AuditRow[];
}

export async function getSettingsPage(): Promise<SettingsPageData> {
  await requireSession();
  const supabase = getSupabaseServiceClient();
  const [rulesRes, setRes, entriesRes, keysRes, auditRes] = await Promise.all([
    supabase.from("hub_rules").select("*").order("key"),
    supabase.from("settings").select("key,value").in("key", ["priority.weights", "store.name", "locale.default"]),
    supabase.from("list_entries").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(200),
    supabase
      .from("api_keys")
      .select("id,name,scope,key_prefix,is_active,last_used_at,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(25),
  ]);
  for (const [ctx, r] of [
    ["রুল", rulesRes],
    ["সেটিংস", setRes],
    ["ব্লক/অ্যালাও লিস্ট", entriesRes],
    ["API কী", keysRes],
    ["অডিট লগ", auditRes],
  ] as const) {
    if (r.error) fail(ctx, r.error);
  }

  const map = new Map<string, unknown>((setRes.data ?? []).map((r) => [r.key, r.value]));
  const w = (map.get("priority.weights") ?? {}) as Partial<SettingsPageData["weights"]>;
  const dw = DEFAULT_PRIORITY_WEIGHTS;
  const bb = (w.bucketBase ?? {}) as Record<string, number>;

  return {
    rules: (rulesRes.data ?? []) as RuleRow[],
    weights: {
      trust: w.trust ?? dw.trust,
      value: w.value ?? dw.value,
      freshness: w.freshness ?? dw.freshness,
      confidence: w.confidence ?? dw.confidence,
      bucketBase: { high: bb.high ?? dw.bucketBase.high, medium: bb.medium ?? dw.bucketBase.medium },
    },
    storeName: typeof map.get("store.name") === "string" ? (map.get("store.name") as string) : "Vangcur",
    locale: map.get("locale.default") === "en" ? "en" : "bn",
    entries: (entriesRes.data ?? []) as ListEntryRow[],
    entriesTotal: entriesRes.count ?? 0,
    keys: (keysRes.data ?? []) as ApiKeyRow[],
    audit: (auditRes.data ?? []) as AuditRow[],
  };
}
