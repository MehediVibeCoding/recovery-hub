"use server";

import { isUuid } from "../../lib/security";
import { getOrderDetail, type OrderDetail } from "../../lib/data/orders";
import type { ActionResult } from "../../lib/types";
import { requireSession } from "../../lib/auth/guard";

// অর্ডার ব্যাকআপ শুধু-পড়ার — এখানে কোনো মিউটেশন নেই
export async function loadOrderDetail(id: string): Promise<ActionResult<OrderDetail>> {
  await requireSession();
  if (!isUuid(id)) return { ok: false, error: "অবৈধ আইডি" };
  try {
    const detail = await getOrderDetail(id);
    if (!detail) return { ok: false, error: "অর্ডার পাওয়া যায়নি" };
    return { ok: true, data: detail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "লোড করা যায়নি" };
  }
}
