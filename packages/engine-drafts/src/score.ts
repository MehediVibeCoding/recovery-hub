import type { DraftInput, ScoreFactor } from "./types.ts";
import { scoreAmount } from "./modules/amount.ts";
import { scoreQuantity } from "./modules/quantity.ts";
import { scoreAddress } from "./modules/address.ts";
import { scoreBehavior } from "./modules/behavior.ts";
import { scoreHour } from "./modules/hour.ts";

// Total number of optional modules used for the confidence denominator.
// Kept in one place so confidence stays correct as modules are added.
const TOTAL_OPTIONAL_MODULES = 5;

export interface CombinedDraftScore {
  score: number; // 0-100, mean of the known modules
  confidence: number; // 0-1, fraction of optional modules that had data
  factors: ScoreFactor[];
}

/**
 * Combines the per-module results into one score + confidence.
 * Unlike the owner's old order-scoring engine, confidence here is baked in
 * from the start (not bolted on afterwards) — exactly to avoid the "sparse
 * draft scores 100 at confidence 0.07" problem found in the old engine.
 */
export function combineDraftScore(input: DraftInput): CombinedDraftScore {
  const results = [
    scoreAmount(input.cartTotal),
    scoreQuantity(input.cartItems),
    scoreAddress(input.address),
    scoreBehavior(input.behavior),
    scoreHour(input.hourOfDay),
  ];

  const known = results.filter((r): r is ScoreFactor => r !== null);
  const confidence = known.length / TOTAL_OPTIONAL_MODULES;
  const score =
    known.length === 0
      ? 50 // nothing known — neutral, rule layer's low-confidence rule will catch it
      : Math.round(known.reduce((sum, f) => sum + f.points, 0) / known.length);

  return { score, confidence, factors: known };
}
