import type { PriorityBucket } from "./ruleLayer.js";

export interface PriorityWeights {
  trust: number;
  value: number;
  freshness: number;
  confidence: number;
  bucketBase: Record<string, number>;
}

// Matches the `priority.weights` row seeded in the DB (settings table).
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  trust: 0.55,
  value: 0.2,
  freshness: 0.15,
  confidence: 0.1,
  bucketBase: { high: 100, medium: 0 },
};

export interface PriorityInput {
  bucket: PriorityBucket;
  trustScore: number; // 0-100
  confidence: number; // 0-1
  cartTotal: number; // BDT
  minutesSinceActivity: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// A fresher draft (just abandoned) ranks higher than a week-old one.
function freshnessScore(minutesSinceActivity: number): number {
  const DECAY_WINDOW_MINUTES = 24 * 60; // fully decayed after 1 day
  return clamp(100 - (minutesSinceActivity / DECAY_WINDOW_MINUTES) * 100, 0, 100);
}

// No merchant-average yet (Phase 1) — a flat cap keeps very large carts from
// dominating the sort; revisit once `merchantStats` is wired (doc 06 table).
function valueScore(cartTotal: number): number {
  const CAP = 5000;
  return clamp((cartTotal / CAP) * 100, 0, 100);
}

export function computePriority(
  input: PriorityInput,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): number {
  const base = weights.bucketBase[input.bucket] ?? 0;
  const weighted =
    weights.trust * input.trustScore +
    weights.value * valueScore(input.cartTotal) +
    weights.freshness * freshnessScore(input.minutesSinceActivity) +
    weights.confidence * input.confidence * 100;

  return Math.round((base + weighted) * 100) / 100;
}
