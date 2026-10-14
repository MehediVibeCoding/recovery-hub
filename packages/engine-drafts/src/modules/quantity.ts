import type { ScoreFactor } from "../types.ts";

const SUSPICIOUS_QTY = 6; // single-item qty above this is unusual for a retail gadget buyer

export function scoreQuantity(
  cartItems: { id: string; qty: number }[] | undefined
): ScoreFactor | null {
  if (!cartItems || cartItems.length === 0) return null;

  const maxQty = Math.max(...cartItems.map((i) => i.qty));
  if (maxQty > SUSPICIOUS_QTY) {
    return {
      module: "quantity",
      points: 50,
      reason: `একটা আইটেমের পরিমাণ অস্বাভাবিক বেশি (${maxQty})`,
    };
  }
  return { module: "quantity", points: 100, reason: "পরিমাণ স্বাভাবিক" };
}
