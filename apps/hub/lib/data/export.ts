import "server-only";
import { getSupabaseServiceClient } from "../supabase/server";
import { dhakaDateToISO } from "../format";
import { fail } from "./util";

export const EXPORT_ROW_CAP = 20000;
const BATCH = 1000;

export type ExportKind = "drafts" | "orders" | "contacts" | "audit";

export interface ExportDataset {
  kind: ExportKind;
  table: string;
  title: string;
  description: string;
  dateColumn: string;
  orderColumn: string;
  columns: { key: string; label: string }[];
  /** সমর্থিত অতিরিক্ত ফিল্টার (query param নাম) */
  filters: ("status" | "bucket" | "dnc")[];
}

export const DATASETS: Record<ExportKind, ExportDataset> = {
  drafts: {
    kind: "drafts",
    table: "checkout_drafts",
    title: "ড্রাফট (Abandoned Checkouts)",
    description: "গ্রাহকের তথ্য, কার্ট, ট্রাস্ট স্কোর, বাকেট ও স্ট্যাটাস",
    dateColumn: "created_at",
    orderColumn: "created_at",
    filters: ["status", "bucket"],
    columns: [
      { key: "created_at", label: "তৈরির সময়" },
      { key: "last_activity_at", label: "শেষ অ্যাক্টিভিটি" },
      { key: "customer_name", label: "নাম" },
      { key: "phone", label: "ফোন" },
      { key: "email", label: "ইমেইল" },
      { key: "district", label: "জেলা" },
      { key: "upazila", label: "উপজেলা" },
      { key: "address", label: "ঠিকানা" },
      { key: "cart_total", label: "কার্ট টোটাল" },
      { key: "cart_items", label: "কার্ট আইটেম" },
      { key: "status", label: "স্ট্যাটাস" },
      { key: "bucket", label: "বাকেট" },
      { key: "priority", label: "প্রায়োরিটি" },
      { key: "trust_score", label: "ট্রাস্ট স্কোর" },
      { key: "trust_confidence", label: "কনফিডেন্স" },
      { key: "rule_flags", label: "ফ্ল্যাগ" },
      { key: "do_not_contact", label: "DNC" },
      { key: "utm_source", label: "UTM Source" },
      { key: "recovered_order_id", label: "রিকভার্ড অর্ডার" },
      { key: "recovered_at", label: "রিকভারির সময়" },
      { key: "admin_note", label: "নোট" },
      { key: "session_id", label: "সেশন আইডি" },
    ],
  },
  orders: {
    kind: "orders",
    table: "orders_backup",
    title: "অর্ডার ব্যাকআপ",
    description: "কনফার্মড অর্ডার, টাকার হিসাব, পেমেন্ট ও স্ট্যাটাস",
    dateColumn: "created_at",
    orderColumn: "created_at",
    filters: ["status"],
    columns: [
      { key: "external_order_id", label: "অর্ডার আইডি" },
      { key: "order_created_at", label: "অর্ডারের সময়" },
      { key: "created_at", label: "ব্যাকআপের সময়" },
      { key: "customer_name", label: "নাম" },
      { key: "phone", label: "ফোন" },
      { key: "email", label: "ইমেইল" },
      { key: "district", label: "জেলা" },
      { key: "address", label: "ঠিকানা" },
      { key: "items", label: "আইটেম" },
      { key: "subtotal", label: "সাবটোটাল" },
      { key: "shipping", label: "শিপিং" },
      { key: "discount", label: "ডিসকাউন্ট" },
      { key: "total", label: "মোট" },
      { key: "payment_method", label: "পেমেন্ট মাধ্যম" },
      { key: "payment_status", label: "পেমেন্ট স্ট্যাটাস" },
      { key: "order_status", label: "অর্ডার স্ট্যাটাস" },
      { key: "session_id", label: "সেশন আইডি" },
    ],
  },
  contacts: {
    kind: "contacts",
    table: "contacts",
    title: "কন্টাক্টস",
    description: "ফোন নম্বরভিত্তিক ডেলিভারি/রিটার্ন ইতিহাস ও DNC",
    dateColumn: "created_at",
    orderColumn: "created_at",
    filters: ["dnc"],
    columns: [
      { key: "phone", label: "ফোন" },
      { key: "name", label: "নাম" },
      { key: "delivered_count", label: "ডেলিভারড" },
      { key: "returned_count", label: "রিটার্নড" },
      { key: "cancelled_count", label: "ক্যানসেলড" },
      { key: "courier_success", label: "কুরিয়ার সফল" },
      { key: "courier_total", label: "কুরিয়ার মোট" },
      { key: "do_not_contact", label: "DNC" },
      { key: "opted_out_at", label: "অপ্ট-আউট সময়" },
      { key: "note", label: "নোট" },
      { key: "created_at", label: "তৈরি" },
      { key: "updated_at", label: "আপডেট" },
    ],
  },
  audit: {
    kind: "audit",
    table: "audit_log",
    title: "অডিট লগ",
    description: "অ্যাডমিন অ্যাকশনের ইতিহাস",
    dateColumn: "created_at",
    orderColumn: "created_at",
    filters: [],
    columns: [
      { key: "created_at", label: "সময়" },
      { key: "actor", label: "কে" },
      { key: "action", label: "অ্যাকশন" },
      { key: "target", label: "টার্গেট" },
      { key: "detail", label: "বিস্তারিত" },
    ],
  },
};

export const DRAFT_STATUSES = ["draft", "contacted", "recovered", "lost", "invalid", "junk"];
export const DRAFT_BUCKETS = ["high", "medium", "review", "junk", "no_contact"];

export interface ExportFilters {
  from?: string;
  to?: string;
  status?: string;
  bucket?: string;
  dnc?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyExportFilters(qb: any, ds: ExportDataset, f: ExportFilters) {
  const fromISO = dhakaDateToISO(f.from);
  const toISO = dhakaDateToISO(f.to, 1);
  if (fromISO) qb = qb.gte(ds.dateColumn, fromISO);
  if (toISO) qb = qb.lt(ds.dateColumn, toISO);

  if (ds.kind === "drafts") {
    if (f.status && DRAFT_STATUSES.includes(f.status)) qb = qb.eq("status", f.status);
    if (f.bucket && DRAFT_BUCKETS.includes(f.bucket)) qb = qb.eq("bucket", f.bucket);
  }
  if (ds.kind === "orders" && f.status && f.status !== "all") {
    qb = qb.eq("order_status", f.status.slice(0, 40));
  }
  if (ds.kind === "contacts" && f.dnc === "1") qb = qb.eq("do_not_contact", true);
  return qb;
}

export async function countRows(ds: ExportDataset, f: ExportFilters): Promise<number> {
  const supabase = getSupabaseServiceClient();
  const { count, error } = await applyExportFilters(
    supabase.from(ds.table).select("*", { count: "exact", head: true }),
    ds,
    f
  );
  if (error) fail(`${ds.title} কাউন্ট`, error);
  return count ?? 0;
}

export async function fetchRows(
  ds: ExportDataset,
  f: ExportFilters
): Promise<{ rows: Record<string, unknown>[]; truncated: boolean }> {
  const supabase = getSupabaseServiceClient();
  const select = ds.columns.map((c) => c.key).join(",");
  const rows: Record<string, unknown>[] = [];
  let truncated = false;

  for (let offset = 0; offset < EXPORT_ROW_CAP; offset += BATCH) {
    const { data, error } = await applyExportFilters(supabase.from(ds.table).select(select), ds, f)
      .order(ds.orderColumn, { ascending: false })
      .range(offset, offset + BATCH - 1);
    if (error) fail(`${ds.title} এক্সপোর্ট`, error);
    const chunk = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...chunk);
    if (chunk.length < BATCH) return { rows, truncated };
    if (offset + BATCH >= EXPORT_ROW_CAP) truncated = true;
  }
  return { rows, truncated };
}

export async function distinctOrderStatuses(): Promise<string[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("orders_backup").select("order_status").limit(5000);
  return Array.from(new Set((data ?? []).map((r) => r.order_status).filter((s): s is string => Boolean(s)))).sort();
}
