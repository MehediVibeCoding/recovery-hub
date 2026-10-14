import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import { PAGE_SIZE } from "../constants/pagination";
import { dhakaDateToISO } from "../format";
import { safeSearchTerm } from "../security";
import type { OrderRow } from "../types";
import { fail, num, pageParam, strParam } from "./util";

export interface OrdersParams {
  status: string; // "all" বা order_status মান
  q: string;
  from: string;
  to: string;
  page: number;
}

type SP = Record<string, string | string[] | undefined>;

export function parseOrdersParams(sp: SP): OrdersParams {
  const ymd = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const status = strParam(sp.status).slice(0, 40);
  return {
    status: status || "all",
    q: safeSearchTerm(strParam(sp.q)),
    from: ymd(strParam(sp.from)),
    to: ymd(strParam(sp.to)),
    page: pageParam(sp.page),
  };
}

const LIST_COLUMNS =
  "id,external_order_id,customer_name,phone,district,total,payment_method,payment_status,order_status,order_created_at,created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(qb: any, p: OrdersParams, withStatus: boolean) {
  if (withStatus && p.status !== "all") {
    qb = p.status === "__none" ? qb.is("order_status", null) : qb.eq("order_status", p.status);
  }
  if (p.q) {
    const s = p.q;
    qb = qb.or(`external_order_id.ilike.%${s}%,customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
  }
  const fromISO = dhakaDateToISO(p.from);
  const toISO = dhakaDateToISO(p.to, 1);
  if (fromISO) qb = qb.gte("created_at", fromISO);
  if (toISO) qb = qb.lt("created_at", toISO);
  return qb;
}

const SUM_CAP = 5000;

export interface OrdersPage {
  rows: OrderRow[];
  total: number;
  grandTotal: number;
  grandCapped: boolean;
  statusCounts: { status: string; count: number }[];
  pageSize: number;
}

export async function listOrders(p: OrdersParams): Promise<OrdersPage> {
  const supabase = getSupabaseServiceClient();
  const from = (p.page - 1) * PAGE_SIZE;

  const listQ = applyFilters(supabase.from("orders_backup").select(LIST_COLUMNS, { count: "exact" }), p, true)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // স্ট্যাটাস চিপের কাউন্ট: স্ট্যাটাস ছাড়া বাকি ফিল্টার প্রযোজ্য (SUM_CAP সারি পর্যন্ত)
  const chipQ = applyFilters(supabase.from("orders_backup").select("order_status"), p, false).limit(SUM_CAP);
  const sumQ = applyFilters(supabase.from("orders_backup").select("total"), p, true).limit(SUM_CAP);

  const [listRes, chipRes, sumRes] = await Promise.all([listQ, chipQ, sumQ]);
  if (listRes.error) fail("অর্ডার তালিকা", listRes.error);
  if (chipRes.error) fail("অর্ডার স্ট্যাটাস", chipRes.error);
  if (sumRes.error) fail("অর্ডার যোগফল", sumRes.error);

  const tally = new Map<string, number>();
  for (const r of (chipRes.data ?? []) as { order_status: string | null }[]) {
    const k = r.order_status ?? "__none";
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  const sumRows = (sumRes.data ?? []) as { total: number | string }[];

  return {
    rows: (listRes.data ?? []) as OrderRow[],
    total: listRes.count ?? 0,
    grandTotal: sumRows.reduce((a, r) => a + num(r.total), 0),
    grandCapped: sumRows.length >= SUM_CAP,
    statusCounts: [...tally.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    pageSize: PAGE_SIZE,
  };
}

export interface OrderDetail {
  order: OrderRow & {
    session_id: string | null;
    email: string | null;
    address: string | null;
    items: { name?: string; qty?: number; price?: number; sku?: string; product_id?: string }[] | null;
    subtotal: number | string | null;
    shipping: number | string | null;
    discount: number | string | null;
    raw_payload: unknown;
  };
  recoveredDraft: { id: string; customer_name: string | null; recovered_at: string | null } | null;
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const supabase = getSupabaseServiceClient();
  const { data: order, error } = await supabase.from("orders_backup").select("*").eq("id", id).maybeSingle();
  if (error) fail("অর্ডার ডিটেইল", error);
  if (!order) return null;

  const { data: draft } = await supabase
    .from("checkout_drafts")
    .select("id,customer_name,recovered_at")
    .eq("recovered_order_id", order.external_order_id)
    .limit(1)
    .maybeSingle();

  return { order: order as OrderDetail["order"], recoveredDraft: draft ?? null };
}
