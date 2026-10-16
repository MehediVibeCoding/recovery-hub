export type PriorityBucket = "high" | "medium" | "review" | "junk" | "no_contact";

export interface RuleLayerContext {
  phoneNormalized: string | null;
  score: number; // engine ScoreResult.score
  confidence: number; // engine ScoreResult.confidence
  blocklisted?: boolean;
  allowlisted?: boolean;
  history?: { delivered: number; returned: number; cancelled: number };
  courier?: { success: number; total: number };
  /** ইঞ্জিনের সন্দেহজনক সংকেত (ScoreResult.flags) — যেমন gibberish_address, bad_name */
  engineFlags?: string[];
  /** ইঞ্জিন নিজেই ঠিক করেছে নাম+ঠিকানা+ফোন তিনটাই ভুয়া (ScoreResult.hardJunk) */
  engineJunk?: boolean;
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

/**
 * স্কোর এর নিচে হলে বাকেট কখনো High/Medium হবে না — Review-তে যাবে।
 * (ইঞ্জিনের "মৌলিক তথ্য খারাপ" ক্যাপগুলো সাধারণত স্কোরকে এর নিচে নামায়।)
 */
export const LOW_SCORE_REVIEW_BELOW = 45;

/** ইঞ্জিনের যে সংকেত এলে বাকেট অন্তত Review হয় */
export const SUSPICIOUS_ENGINE_FLAGS = [
  "gibberish_address",
  "refusal_text",
  "district_mismatch",
  "bad_name",
  "suspicious_phone",
  "disposable_email",
];

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

  // নাম + ঠিকানা + ফোন তিনটাই ভুয়া — ইতিহাস যাই হোক junk
  if (ctx.engineJunk) {
    return { bucket: "junk", flags: ["fake_identity"] };
  }

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

  // ইঞ্জিন যা সন্দেহজনক ধরেছে (অর্থহীন ঠিকানা/নাম, ডামি ফোন, জেলা না মেলা ইত্যাদি)
  for (const f of ctx.engineFlags ?? []) {
    if (SUSPICIOUS_ENGINE_FLAGS.includes(f)) {
      flags.push(f);
      bucket = "review";
    }
  }

  if (ctx.score < LOW_SCORE_REVIEW_BELOW) {
    flags.push("low_score");
    bucket = "review";
  }

  return { bucket, flags };
}
