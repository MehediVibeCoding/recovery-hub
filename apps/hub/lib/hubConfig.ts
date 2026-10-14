import "server-only";
import {
  DEFAULT_PRIORITY_WEIGHTS,
  DEFAULT_RULE_PARAMS,
  type PriorityWeights,
  type RuleLayerParams,
} from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "./supabase/server";

/**
 * Settings পেজে বদলানো hub_rules + priority.weights ingest-এ কার্যকর করার লোডার।
 * যেকোনো সমস্যায় (DB error, ভুল আকার) নিরাপদে ডিফল্টে ফিরে যায় — ingest কখনো আটকায় না।
 */
export interface ScoringConfig {
  ruleParams: RuleLayerParams;
  weights: PriorityWeights;
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export async function loadScoringConfig(): Promise<ScoringConfig> {
  const fallback: ScoringConfig = {
    ruleParams: DEFAULT_RULE_PARAMS,
    weights: DEFAULT_PRIORITY_WEIGHTS,
  };
  try {
    const supabase = getSupabaseServiceClient();
    const [rulesRes, wRes] = await Promise.all([
      supabase.from("hub_rules").select("key,enabled,params"),
      supabase.from("settings").select("value").eq("key", "priority.weights").maybeSingle(),
    ]);
    if (rulesRes.error) return fallback;

    const rules = new Map<string, { enabled: boolean; params: Record<string, unknown> }>();
    for (const r of rulesRes.data ?? []) rules.set(r.key, { enabled: r.enabled, params: (r.params ?? {}) as Record<string, unknown> });

    const D = DEFAULT_RULE_PARAMS;
    const hr = rules.get("history_repeat_returns");
    const cl = rules.get("courier_low_success");
    const lc = rules.get("low_confidence_review");

    // বন্ধ রুল = এমন প্যারামিটার যা কখনো ট্রিগার হয় না
    const ruleParams: RuleLayerParams = {
      ...D,
      historyRepeatReturns:
        hr && !hr.enabled
          ? { minReturned: Number.MAX_SAFE_INTEGER, maxDelivered: -1 }
          : {
              minReturned: num(hr?.params.minReturned, D.historyRepeatReturns.minReturned),
              maxDelivered: num(hr?.params.maxDelivered, D.historyRepeatReturns.maxDelivered),
            },
      courierLowSuccess:
        cl && !cl.enabled
          ? { minTotal: Number.MAX_SAFE_INTEGER, maxRatio: 0 }
          : {
              minTotal: num(cl?.params.minTotal, D.courierLowSuccess.minTotal),
              maxRatio: num(cl?.params.maxRatio, D.courierLowSuccess.maxRatio),
            },
      lowConfidenceReview:
        lc && !lc.enabled
          ? { minConfidence: -1 }
          : { minConfidence: num(lc?.params.minConfidence, D.lowConfidenceReview.minConfidence) },
    };

    const w = (wRes.data?.value ?? null) as Partial<PriorityWeights> | null;
    const dw = DEFAULT_PRIORITY_WEIGHTS;
    const weights: PriorityWeights = w
      ? {
          trust: num(w.trust, dw.trust),
          value: num(w.value, dw.value),
          freshness: num(w.freshness, dw.freshness),
          confidence: num(w.confidence, dw.confidence),
          bucketBase: { ...dw.bucketBase, ...(w.bucketBase ?? {}) },
        }
      : dw;

    return { ruleParams, weights };
  } catch {
    return fallback;
  }
}
