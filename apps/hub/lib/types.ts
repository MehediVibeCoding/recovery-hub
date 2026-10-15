export type DraftStatus = "draft" | "contacted" | "recovered" | "lost" | "invalid" | "junk";
export type Bucket = "high" | "medium" | "review" | "junk" | "no_contact";

export interface CartItem {
  product_id?: string;
  name?: string;
  sku?: string;
  qty?: number;
  price?: number;
  image?: string;
}

export interface DraftRow {
  id: string;
  session_id: string;
  customer_name: string | null;
  phone: string | null;
  phone_raw: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  upazila: string | null;
  cart_items: CartItem[] | null;
  cart_total: number | string;
  status: DraftStatus;
  bucket: Bucket | null;
  priority: number | string | null;
  trust_score: number | null;
  trust_confidence: number | string | null;
  rule_flags: string[] | null;
  do_not_contact: boolean;
  admin_note: string | null;
  utm_source: string | null;
  recovered_order_id: string | null;
  recovered_at: string | null;
  first_seen_at: string;
  last_activity_at: string;
  created_at: string;
}

export interface DraftEvent {
  id: number;
  type: string;
  actor: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ScoreFactor {
  module: string;
  points: number;
  reason: string;
}

export interface OrderRow {
  id: string;
  external_order_id: string;
  customer_name: string | null;
  phone: string | null;
  district: string | null;
  total: number | string;
  payment_method: string | null;
  payment_status: string | null;
  order_status: string | null;
  order_created_at: string | null;
  created_at: string;
}

export interface ContactRow {
  phone: string;
  name: string | null;
  delivered_count: number;
  returned_count: number;
  cancelled_count: number;
  courier_success: number | null;
  courier_total: number | null;
  do_not_contact: boolean;
  opted_out_at: string | null;
  note: string | null;
  updated_at: string;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

// ---------- স্টক নোটিফিকেশন রিকোয়েস্ট ----------
export type StockRequestStatus = "pending" | "notified" | "cancelled";

export interface StockRequestRow {
  id: string;
  product_id: string;
  product_name: string | null;
  customer_name: string | null;
  phone: string;
  status: StockRequestStatus;
  restocked_at: string | null;
  restocked_stock: number | null;
  notified_at: string | null;
  created_at: string;
}
