import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import { PAGE_SIZE } from "../constants/pagination";
import { safeSearchTerm } from "../security";
import type { Bucket, ContactRow, DraftEvent, DraftRow, DraftStatus } from "../types";
import { fail, pageParam, strParam } from "./util";

export const STATUS_FILTERS = ["open", "draft", "contacted", "recovered", "lost", "invalid", "junk", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export const BUCKETS: Bucket[] = ["high", "medium", "review", "junk", "no_contact"];
export const SORTS = ["priority", "latest", "value"] as const;
export type SortKey = (typeof SORTS)[number];

export interface DraftsParams {
  status: StatusFilter;
  bucket: Bucket | "all";
  q: string;
  sort: SortKey;
  page: number;
}

type SP = Record<string, string | string[] | undefined>;

export function parseDraftsParams(sp: SP): DraftsParams {
  const status = strParam(sp.status) as StatusFilter;
  const bucket = strParam(sp.bucket) as Bucket;
  const sort = strParam(sp.sort) as SortKey;
  return {
    status: STATUS_FILTERS.includes(status) ? status : "open",
    bucket: BUCKETS.includes(bucket) ? bucket : "all",
    q: safeSearchTerm(strParam(sp.q)),
    sort: SORTS.includes(sort) ? sort : "priority",
    page: pageParam(sp.page),
  };
}

// তালিকায় হালকা কলাম — trust_result/behavior/user_agent ডিটেইলে (DESIGN_SYSTEM §৮.৩)
const LIST_COLUMNS =
  "id,session_id,customer_name,phone,phone_raw,email,address,district,upazila,cart_items,cart_total,status,bucket,priority,trust_score,trust_confidence,rule_flags,do_not_contact,admin_note,utm_source,recovered_order_id,recovered_at,first_seen_at,last_activity_at,created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCommon(qb: any, p: { bucket: Bucket | "all"; q: string }) {
  if (p.bucket !== "all") qb = qb.eq("bucket", p.bucket);
  if (p.q) {
    const s = p.q;
    qb = qb.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%,phone_raw.ilike.%${s}%,email.ilike.%${s}%`);
  }
  return qb;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStatus(qb: any, status: StatusFilter) {
  if (status === "open") return qb.in("status", ["draft", "contacted"]);
  if (status === "all") return qb;
  return qb.eq("status", status);
}

export interface DraftsPage {
  rows: DraftRow[];
  total: number;
  counts: Record<StatusFilter, number>;
  pageSize: number;
}

export async function listDrafts(p: DraftsParams): Promise<DraftsPage> {
  const supabase = getSupabaseServiceClient();
  const from = (p.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let listQ = applyStatus(
    applyCommon(supabase.from("checkout_drafts").select(LIST_COLUMNS, { count: "exact" }), p),
    p.status
  );
  if (p.sort === "latest") listQ = listQ.order("last_activity_at", { ascending: false });
  else if (p.sort === "value") listQ = listQ.order("cart_total", { ascending: false }).order("id");
  else listQ = listQ.order("priority", { ascending: false, nullsFirst: false }).order("last_activity_at", { ascending: false });
  listQ = listQ.range(from, to);

  const statuses: DraftStatus[] = ["draft", "contacted", "recovered", "lost", "invalid", "junk"];
  const countQs = statuses.map((s) =>
    applyCommon(supabase.from("checkout_drafts").select("id", { count: "exact", head: true }).eq("status", s), p)
  );

  const [listRes, ...countRes] = await Promise.all([listQ, ...countQs]);
  if (listRes.error) fail("ড্রাফট তালিকা", listRes.error);

  const counts = { open: 0, all: 0 } as Record<StatusFilter, number>;
  statuses.forEach((s, i) => {
    const c = countRes[i].count ?? 0;
    counts[s] = c;
    counts.all += c;
    if (s === "draft" || s === "contacted") counts.open += c;
  });

  return {
    rows: (listRes.data ?? []) as DraftRow[],
    total: listRes.count ?? 0,
    counts,
    pageSize: PAGE_SIZE,
  };
}

export interface DraftDetail {
  draft: DraftRow & {
    notes: string | null;
    landing_url: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    hour_of_day: number | null;
    trust_result: { score?: number; bucket?: string; confidence?: number; factors?: { module: string; points: number; reason: string }[] } | null;
    behavior: Record<string, unknown> | null;
  };
  events: DraftEvent[];
  contact: ContactRow | null;
  orderCount: number;
}

export async function getDraftDetail(id: string): Promise<DraftDetail | null> {
  const supabase = getSupabaseServiceClient();
  const { data: draft, error } = await supabase.from("checkout_drafts").select("*").eq("id", id).maybeSingle();
  if (error) fail("ড্রাফট ডিটেইল", error);
  if (!draft) return null;

  const [evRes, contactRes, orderRes] = await Promise.all([
    supabase
      .from("draft_events")
      .select("id,type,actor,payload,created_at")
      .eq("draft_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    draft.phone
      ? supabase.from("contacts").select("*").eq("phone", draft.phone).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    draft.phone
      ? supabase.from("orders_backup").select("id", { count: "exact", head: true }).eq("phone", draft.phone)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  return {
    draft: draft as DraftDetail["draft"],
    events: (evRes.data ?? []) as DraftEvent[],
    contact: (contactRes.data ?? null) as ContactRow | null,
    orderCount: (orderRes as { count: number | null }).count ?? 0,
  };
}
