import { normalizeBdPhone } from "@recovery-hub/shared";
import type { DraftInput, ScoreResult } from "./types.ts";
import { combineDraftScore } from "./score.ts";

/**
 * চেকআউট-ড্রাফটের (abandoned checkout) জন্য আলাদা স্কোরিং ইঞ্জিন v2।
 *
 * মেইন সাইটের অর্ডার-ইঞ্জিন (cloud-vangcur/lib/riskEngine.ts) থেকে ফোন, নাম, ঠিকানা (গিবারিশ ও
 * জেলা-উপজেলা-ইউনিয়ন মিল), ইমেইল ও অ্যামাউন্ট-যাচাই নেওয়া হয়েছে। যে ডেটা ড্রাফটে আসে না
 * (অগ্রিম/বিকাশ, আইপি, লিমিট-হিট, কুরিয়ার, honeypot) সেগুলো ইচ্ছাকৃতভাবে বাদ।
 *
 * ব্লক/অ্যালো-লিস্ট, কুরিয়ার/রিটার্ন-ইতিহাস রুল ডেটাবেস লাগে বলে একধাপ ওপরে —
 * Hub rule layer (@recovery-hub/shared `applyRuleLayer`)-এ।
 */
export const ENGINE_VERSION = 2;

export function scoreDraft(input: DraftInput): ScoreResult {
  const phoneNormalized = normalizeBdPhone(input.phoneRaw);

  if (!phoneNormalized) {
    return {
      score: 0,
      bucket: "no_contact",
      confidence: 0,
      phoneNormalized: null,
      factors: [{ module: "phone", points: 0, reason: "কোনো বৈধ ফোন নম্বর পাওয়া যায়নি" }],
      flags: [],
      hardJunk: false,
    };
  }

  const c = combineDraftScore(input, phoneNormalized);

  return {
    score: c.score,
    // সাময়িক বাকেট — চূড়ান্ত সিদ্ধান্ত Hub rule layer-এর
    bucket: c.hardJunk ? "junk" : c.score >= 70 ? "high" : c.score >= 45 ? "review" : "low",
    confidence: c.confidence,
    phoneNormalized,
    factors: c.factors,
    flags: c.flags,
    hardJunk: c.hardJunk,
  };
}

export type { DraftInput, ScoreResult, TrustBucket, ScoreFactor, FactorTone } from "./types.ts";
export { combineDraftScore, WEIGHTS, CAPS } from "./score.ts";
