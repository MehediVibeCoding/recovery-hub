import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import { dhakaDateKey, dhakaDayStartISO } from "../format";
import type { Bucket, DraftRow } from "../types";
import { fail, num } from "./util";

export interface OverviewData {
  draftsToday: number;
  drafts7d: number;
  recovered7d: number;
  recoveryRate: number | null; // 0-100
  recovered30d: number;
  recoveredValue30d: number;
  pendingValue: number;
  openByBucket: Record<Bucket, number>;
  openTotal: number;
  orders7d: number;
  ordersValue7d: number;
  perDay: { key: string; label: string; count: number }[];
  recentDrafts: Pick<DraftRow, "id" | "customer_name" | "phone" | "cart_total" | "status" | "bucket" | "last_activity_at">[];
  recentAudit: { id: number; actor: string; action: string; target: string | null; created_at: string }[];
  agent: { state: "none" | "online" | "offline"; lastSeen: string | null };
}

const BN_DAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

export async function getOverview(): Promise<OverviewData> {
  const supabase = getSupabaseServiceClient();
  const now = Date.now();
  const todayStart = dhakaDayStartISO(0, now);
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const weekStart = dhakaDayStartISO(-6, now); // আজসহ ৭ দিন

  const buckets: Bucket[] = ["high", "medium", "review", "junk", "no_contact"];
  const open = ["draft", "contacted"];


  const [
    todayRes,
    d7Res,
    rec7Res,
    statsRes,
    perDayRes,
    recentRes,
    auditRes,
    orders7Res,
    agentRes,
    ...bucketRes
  ] = await Promise.all([
    supabase.from("checkout_drafts").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("checkout_drafts").select("id", { count: "exact", head: true }).gte("created_at", d7),
    supabase
      .from("checkout_drafts")
      .select("id", { count: "exact", head: true })
      .eq("status", "recovered")
      .gte("recovered_at", d7),
    supabase.from("v_draft_stats").select("*").maybeSingle(),
    supabase.from("checkout_drafts").select("created_at").gte("created_at", weekStart).limit(5000),
    supabase
      .from("checkout_drafts")
      .select("id,customer_name,phone,cart_total,status,bucket,last_activity_at")
      .order("last_activity_at", { ascending: false })
      .limit(6),
    supabase.from("audit_log").select("id,actor,action,target,created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("orders_backup").select("total", { count: "exact" }).gte("created_at", d7).limit(5000),
    supabase.from("api_keys").select("last_used_at,is_active").eq("scope", "agent").eq("is_active", true),
    ...buckets.map((b) =>
      supabase.from("checkout_drafts").select("id", { count: "exact", head: true }).in("status", open).eq("bucket", b)
    ),
  ]);

  for (const [ctx, r] of [
    ["আজকের ড্রাফট", todayRes],
    ["৭ দিনের ড্রাফট", d7Res],
    ["রিকভার্ড", rec7Res],
    ["স্ট্যাটস", statsRes],
    ["দৈনিক ড্রাফট", perDayRes],
    ["সাম্প্রতিক ড্রাফট", recentRes],
    ["অডিট", auditRes],
    ["অর্ডার", orders7Res],
  ] as const) {
    if (r.error) fail(ctx, r.error);
  }

  const openByBucket = {} as Record<Bucket, number>;
  let openTotal = 0;
  buckets.forEach((b, i) => {
    const c = bucketRes[i].count ?? 0;
    openByBucket[b] = c;
    openTotal += c;
  });

  const drafts7d = d7Res.count ?? 0;
  const recovered7d = rec7Res.count ?? 0;
  const stats = (statsRes.data ?? {}) as Record<string, unknown>;

  // ৭ দিনের দৈনিক বার (ঢাকার তারিখ)
  const tally = new Map<string, number>();
  for (const r of (perDayRes.data ?? []) as { created_at: string }[]) {
    const k = dhakaDateKey(r.created_at);
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * 86400000;
    const key = dhakaDateKey(new Date(t));
    const dow = new Date(new Date(key + "T00:00:00Z").getTime()).getUTCDay();
    return { key, label: BN_DAYS[dow], count: tally.get(key) ?? 0 };
  });

  const orderRows = (orders7Res.data ?? []) as { total: number | string }[];

  // এজেন্ট স্ট্যাটাস: agent-scope কী-এর last_used_at ৫ মিনিটের মধ্যে হলে অনলাইন
  const agentKeys = (agentRes.error ? [] : agentRes.data ?? []) as { last_used_at: string | null }[];
  const lastSeen = agentKeys
    .map((k) => k.last_used_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop() ?? null;
  const agentState: OverviewData["agent"]["state"] =
    agentKeys.length === 0 ? "none" : lastSeen && now - new Date(lastSeen).getTime() < 5 * 60000 ? "online" : "offline";

  return {
    draftsToday: todayRes.count ?? 0,
    drafts7d,
    recovered7d,
    recoveryRate: drafts7d > 0 ? Math.min(100, Math.round((recovered7d / drafts7d) * 1000) / 10) : null,
    recovered30d: num(stats.recovered_30d),
    recoveredValue30d: num(stats.recovered_value_30d),
    pendingValue: num(stats.pending_value),
    openByBucket,
    openTotal,
    orders7d: orders7Res.count ?? 0,
    ordersValue7d: orderRows.reduce((a, r) => a + num(r.total), 0),
    perDay,
    recentDrafts: (recentRes.data ?? []) as OverviewData["recentDrafts"],
    recentAudit: (auditRes.data ?? []) as OverviewData["recentAudit"],
    agent: { state: agentState, lastSeen },
  };
}
