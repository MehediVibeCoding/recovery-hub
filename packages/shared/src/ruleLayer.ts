export type PriorityBucket = "high" | "medium" | "review" | "junk" | "no_contact";

export interface RuleLayerContext {
  phoneNormalized: string | null;
  score: number; // engine ScoreResult.score
  confidence: number; // engine ScoreResult.confidence
  blocklisted?: boolean;
  allowlisted?: boolean;
  history?: { delivered: number; returned: number; cancelled: number };
  courier?: { success: number; total: number };
}

export interface RuleLayerParams {
  historyRepeatReturns: { minReturned: number; maxDelivered: number };
  courierLowSuccess: { minTotal: number; maxRatio: number };
  lowConfidenceReview: { minConfidence: number };
  highThreshold: number;
}

// Matches the seed rows inserted by database/migrations/0001_init.sql (hub_rules).
export const DEFAULT_RULE_PARAMS: RuleLayerParams = {
  historyRepeatReturns: { minReturned: 2, maxDelivered: 0 },
  courierLowSuccess: { minTotal: 5, maxRatio: 0.4 },
  lowConfidenceReview: { minConfidence: 0.4 },
  highThreshold: 70,
};

export interface RuleLayerResult {
  bucket: PriorityBucket;
  flags: string[];
}

/**
 * Evaluated in order; the first terminal rule wins (doc 06 §4).
 */
export function applyRuleLayer(
  ctx: RuleLayerContext,
  params: RuleLayerParams = DEFAULT_RULE_PARAMS
): RuleLayerResult {
  if (!ctx.phoneNormalized) {
    return { bucket: "no_contact", flags: ["no_phone"] };
  }

  if (ctx.blocklisted) {
    return { bucket: "junk", flags: ["blocklisted"] };
  }

  if (ctx.allowlisted) {
    return { bucket: "high", flags: ["allowlisted"] };
  }

  const flags: string[] = [];
  let bucket: PriorityBucket = ctx.score >= params.highThreshold ? "high" : "medium";

  const h = ctx.history;
  if (
    h &&
    h.returned >= params.historyRepeatReturns.minReturned &&
    h.delivered <= params.historyRepeatReturns.maxDelivered
  ) {
    flags.push("repeat_returner");
    return { bucket: "junk", flags };
  }

  const c = ctx.courier;
  if (c && c.total >= params.courierLowSuccess.minTotal) {
    const ratio = c.success / c.total;
    if (ratio <= params.courierLowSuccess.maxRatio) {
      flags.push("courier_low_success");
      bucket = "review";
    }
  }

  if (ctx.confidence < params.lowConfidenceReview.minConfidence) {
    flags.push("low_confidence");
    bucket = "review";
  }

  return { bucket, flags };
}
