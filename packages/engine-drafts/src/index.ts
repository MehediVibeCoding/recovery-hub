import { normalizeBdPhone } from "@recovery-hub/shared";
import type { DraftInput, ScoreResult } from "./types.ts";
import { combineDraftScore } from "./score.ts";

/**
 * The owner's existing order-scoring engine (used on the live Vangcur site)
 * is left completely untouched. This is a separate, new engine built
 * specifically for abandoned-checkout drafts — see docs/06 and the "new
 * engine" conversation. History/courier/blocklist/allowlist checks need the
 * database, so they live one layer up in the Hub rule layer
 * (@recovery-hub/shared `applyRuleLayer`), not here.
 */
export function scoreDraft(input: DraftInput): ScoreResult {
  const phoneNormalized = normalizeBdPhone(input.phoneRaw);

  if (!phoneNormalized) {
    return {
      score: 0,
      bucket: "no_contact",
      confidence: 0,
      phoneNormalized: null,
      factors: [
        { module: "phone", points: 0, reason: "কোনো বৈধ ফোন নম্বর পাওয়া যায়নি" },
      ],
    };
  }

  const combined = combineDraftScore(input);

  // Honeypot catches are a near-certain bot signal — override the averaged
  // score instead of letting it get diluted by unrelated good-looking fields.
  const honeypotCaught = input.behavior?.honeypotFilled === true;
  const score = honeypotCaught ? 0 : combined.score;
  const confidence = honeypotCaught ? 1 : combined.confidence;
  const factors = combined.factors;

  return {
    score,
    // bucket here is provisional — the Hub rule layer (history/courier/
    // blocklist/confidence) makes the final call before storage.
    bucket: score >= 70 ? "high" : score >= 40 ? "review" : "low",
    confidence,
    phoneNormalized,
    factors: [
      { module: "phone", points: 100, reason: "বৈধ ফোন নম্বর পাওয়া গেছে" },
      ...factors,
    ],
  };
}

export type { DraftInput, ScoreResult, TrustBucket, ScoreFactor } from "./types.ts";
export { combineDraftScore } from "./score.ts";
