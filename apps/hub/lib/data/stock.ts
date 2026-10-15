import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import { PAGE_SIZE } from "../constants/pagination";
import { safeSearchTerm } from "../security";
import type { StockRequestRow } from "../types";
import { fail, pageParam, strParam } from "./util";
import { requireSession } from "../auth/guard";

/**
 * ready    = স্টকে ফিরেছে, এখনো জানানো হয়নি  (pending + restocked_at আছে) ← সবচেয়ে জরুরি
 * waiting  = এখনো স্টকে ফেরেনি                  (pending + restocked_at নেই)
 */
export const STOCK_FILTERS = ["ready", "waiting", "notified", "cancelled", "all"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export interface StockParams {
  status: StockFilter;
  q: string;
  page: number;
}

type SP = Record<string, string | string[] | undefined>;

export function parseStockParams(sp: SP): StockParams {
  const status = strParam(sp.status) as StockFilter;
  return {
    status: STOCK_FILTERS.includes(status) ? status : "ready",
    q: safeSearchTerm(strParam(sp.q)),
    page: pageParam(sp.page),
  };
}

const COLUMNS =
  "id,product_id,product_name,customer_name,phone,status,restocked_at,restocked_stock,notified_at,created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(qb: any, f: StockFilter) {
  if (f === "ready") return qb.eq("status", "pending").not("restocked_at", "is", null);
  if (f === "waiting") return qb.eq("status", "pending").is("restocked_at", null);
  if (f === "notified") return qb.eq("status", "notified");
  if (f === "cancelled") return qb.eq("status", "cancelled");
  return qb;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySearch(qb: any, q: string) {
  if (!q) return qb;
  return qb.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,product_name.ilike.%${q}%,product_id.ilike.%${q}%`);
}

export interface ReadyProduct {
  product_id: string;
  product_name: string;
  count: number;
  stock: number | null;
}

export interface StockPage {
  rows: StockRequestRow[];
  total: number;
  counts: Record<StockFilter, number>;
  readyProducts: ReadyProduct[];
  distinctProducts: number;
  pageSize: number;
}

export async function listStockRequests(p: StockParams): Promise<StockPage> {
  await requireSession();
  const supabase = getSupabaseServiceClient();
  const from = (p.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const listQ = applySearch(applyFilter(supabase.from("stock_requests").select(COLUMNS, { count: "exact" }), p.status), p.q)
    .order("restocked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const countOf = (f: StockFilter) =>
    applySearch(applyFilter(supabase.from("stock_requests").select("id", { count: "exact", head: true }), f), p.q);

  const readyListQ = supabase
    .from("stock_requests")
    .select("product_id,product_name,restocked_stock")
    .eq("status", "pending")
    .not("restocked_at", "is", null)
    .limit(2000);

  const pendingProductsQ = supabase.from("stock_requests").select("product_id").eq("status", "pending").limit(5000);

  const [listRes, readyC, waitingC, notifiedC, cancelledC, allC, readyListRes, pendingRes] = await Promise.all([
    listQ,
    countOf("ready"),
    countOf("waiting"),
    countOf("notified"),
    countOf("cancelled"),
    countOf("all"),
    readyListQ,
    pendingProductsQ,
  ]);
  if (listRes.error) fail("স্টক রিকোয়েস্ট তালিকা", listRes.error);

  const counts: Record<StockFilter, number> = {
    ready: readyC.count ?? 0,
    waiting: waitingC.count ?? 0,
    notified: notifiedC.count ?? 0,
    cancelled: cancelledC.count ?? 0,
    all: allC.count ?? 0,
  };

  const byProduct = new Map<string, ReadyProduct>();
  for (const r of readyListRes.data ?? []) {
    const cur = byProduct.get(r.product_id);
    if (cur) cur.count += 1;
    else
      byProduct.set(r.product_id, {
        product_id: r.product_id,
        product_name: r.product_name || `প্রোডাক্ট #${r.product_id}`,
        count: 1,
        stock: r.restocked_stock ?? null,
      });
  }
  const readyProducts = [...byProduct.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  const distinctProducts = new Set((pendingRes.data ?? []).map((r) => r.product_id)).size;

  return {
    rows: (listRes.data ?? []) as StockRequestRow[],
    total: listRes.count ?? 0,
    counts,
    readyProducts,
    distinctProducts,
    pageSize: PAGE_SIZE,
  };
}
