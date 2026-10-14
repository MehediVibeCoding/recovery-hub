// hub_rules-এর প্যারামিটার স্কিমা — Settings UI ও সার্ভার অ্যাকশন দুই জায়গায় একই সূত্র।
// কী/ডিফল্ট packages/shared-এর DEFAULT_RULE_PARAMS ও 0001_init.sql-এর seed-এর সাথে মেলানো।

export interface RuleField {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  int: boolean;
  help?: string;
}

export interface RuleDef {
  title: string;
  fields: RuleField[];
}

export const RULE_DEFS: Record<string, RuleDef> = {
  history_repeat_returns: {
    title: "বারবার রিটার্ন করা গ্রাহক → Junk",
    fields: [
      { key: "minReturned", label: "ন্যূনতম রিটার্ন", min: 1, max: 50, step: 1, int: true, help: "এতবার বা বেশি রিটার্ন হলে" },
      { key: "maxDelivered", label: "সর্বোচ্চ ডেলিভারড", min: 0, max: 50, step: 1, int: true, help: "ডেলিভারি এর চেয়ে বেশি না হলে" },
    ],
  },
  courier_low_success: {
    title: "কুরিয়ারে কম সফলতা → Review",
    fields: [
      { key: "minTotal", label: "ন্যূনতম পার্সেল", min: 1, max: 1000, step: 1, int: true, help: "এতগুলো পার্সেলের ইতিহাস থাকলে" },
      { key: "maxRatio", label: "সর্বোচ্চ সফলতার হার", min: 0, max: 1, step: 0.05, int: false, help: "০ থেকে ১ (০.৪ = ৪০%)" },
    ],
  },
  low_confidence_review: {
    title: "কম কনফিডেন্স → Review",
    fields: [
      { key: "minConfidence", label: "ন্যূনতম কনফিডেন্স", min: 0, max: 1, step: 0.05, int: false, help: "এর নিচে হলে Review বাকেট" },
    ],
  },
};

export function validateRuleParams(key: string, raw: unknown): { ok: true; params: Record<string, number> } | { ok: false; error: string } {
  const def = RULE_DEFS[key];
  if (!def) return { ok: false, error: "অজানা রুল" };
  if (!raw || typeof raw !== "object") return { ok: false, error: "প্যারামিটার ঠিক নেই" };
  const out: Record<string, number> = {};
  for (const f of def.fields) {
    const v = Number((raw as Record<string, unknown>)[f.key]);
    if (!Number.isFinite(v)) return { ok: false, error: `${f.label}: সংখ্যা দিন` };
    if (v < f.min || v > f.max) return { ok: false, error: `${f.label}: ${f.min} থেকে ${f.max}-এর মধ্যে হতে হবে` };
    if (f.int && !Number.isInteger(v)) return { ok: false, error: `${f.label}: পূর্ণসংখ্যা দিন` };
    out[f.key] = v;
  }
  return { ok: true, params: out };
}

// priority.weights
export interface WeightsInput {
  trust: number;
  value: number;
  freshness: number;
  confidence: number;
  bucketBase: { high: number; medium: number };
}

export function validateWeights(raw: unknown): { ok: true; value: WeightsInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "ওয়েট ঠিক নেই" };
  const r = raw as Record<string, unknown>;
  const w: Record<string, number> = {};
  for (const [k, label] of [
    ["trust", "Trust"],
    ["value", "Value"],
    ["freshness", "Freshness"],
    ["confidence", "Confidence"],
  ] as const) {
    const v = Number(r[k]);
    if (!Number.isFinite(v) || v < 0 || v > 1) return { ok: false, error: `${label}: ০ থেকে ১-এর মধ্যে সংখ্যা দিন` };
    w[k] = v;
  }
  const bb = (r.bucketBase ?? {}) as Record<string, unknown>;
  const high = Number(bb.high);
  const medium = Number(bb.medium);
  if (![high, medium].every((x) => Number.isFinite(x) && x >= 0 && x <= 1000))
    return { ok: false, error: "Bucket base: ০ থেকে ১০০০-এর মধ্যে সংখ্যা দিন" };
  return {
    ok: true,
    value: {
      trust: w.trust,
      value: w.value,
      freshness: w.freshness,
      confidence: w.confidence,
      bucketBase: { high, medium },
    },
  };
}
