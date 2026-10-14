import type { ScoreFactor } from "../types.ts";

export function scoreAmount(cartTotal: number | undefined): ScoreFactor | null {
  if (cartTotal === undefined) return null; // unknown module — skipped, not penalised

  if (cartTotal <= 0) {
    return { module: "amount", points: 0, reason: "কার্টের মূল্য শূন্য বা নেই" };
  }
  return { module: "amount", points: 100, reason: "কার্টের মূল্য স্বাভাবিক" };
}
