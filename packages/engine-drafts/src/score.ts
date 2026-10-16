import type { DraftInput, FactorTone, ScoreFactor } from "./types.ts";
import type { Grade } from "./modules/grade.ts";
import { gradePhone } from "./modules/phone.ts";
import { gradeName } from "./modules/name.ts";
import { gradeAddress } from "./modules/address.ts";
import { gradeEmail } from "./modules/email.ts";
import { gradeAmount } from "./modules/amount.ts";
import { gradeHistory } from "./modules/history.ts";

/**
 * ওজন (মোট ১০০)। ঠিকানা সবচেয়ে ভারী — ডেলিভারি ও যোগাযোগ-পুনরুদ্ধারের আসল ভিত্তি।
 * এই সংখ্যাগুলো এক জায়গায় রাখা: confidence = জানা ওজন ÷ মোট ওজন।
 */
export const WEIGHTS = { phone: 20, address: 30, name: 14, email: 8, amount: 8, history: 20 } as const;
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

/** কোনো নির্দিষ্ট মৌলিক তথ্য খারাপ হলে বাকি ভালো ফিল্ড দিয়ে সেটা ঢাকা যাবে না — স্কোরের সর্বোচ্চ সীমা */
export const CAPS = {
  gibberish_address: 30, // অর্থহীন ঠিকানা বা অর্ডার-বাতিলের লেখা
  suspicious_phone: 40, // ডামি/ক্রমিক/পুনরাবৃত্ত নম্বর
  disposable_email: 35, // সাময়িক ইমেইল সার্ভিস
  bad_name: 45, // অর্থহীন/গালি/টেস্ট নাম
  district_mismatch: 60, // ঠিকানার লেখা বনাম বাছা জেলা
  no_address: 69, // ঠিকানা ছাড়া "High" হওয়া যাবে না
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function toneOf(v: number): FactorTone {
  if (v >= 0.7) return "good";
  if (v >= 0.4) return "warn";
  return "bad";
}

export interface CombinedDraftScore {
  score: number;
  confidence: number;
  factors: ScoreFactor[];
  flags: string[];
  hardJunk: boolean;
}

/**
 * phoneNormalized অবশ্যই বৈধ (index.ts আগেই no_contact ছেঁকে দেয়)।
 * পদ্ধতি: জানা ফ্যাক্টরগুলোর ওজনগড় → নতুন-গ্রাহক সংযোজন → "মৌলিক তথ্য খারাপ" ক্যাপ → ফেক-আইডেন্টিটি।
 * তথ্য না থাকলে (ইমেইল/ঠিকানা/নতুন ইতিহাস) ওই ফ্যাক্টর শাস্তি দেয় না, কিন্তু confidence কমায়।
 */
export function combineDraftScore(input: DraftInput, phoneNormalized: string): CombinedDraftScore {
  const factors: ScoreFactor[] = [];
  let knownWeight = 0;
  let weightedSum = 0;

  const add = (module: string, weight: number, g: Grade) => {
    if (g.value === null) {
      factors.push({ module, points: 0, max: weight, tone: "warn", reason: g.note });
      return;
    }
    factors.push({ module, points: Math.round(g.value * weight * 10) / 10, max: weight, tone: toneOf(g.value), reason: g.note });
    knownWeight += weight;
    weightedSum += g.value * weight;
  };

  const phoneG = gradePhone(phoneNormalized);
  const addressG = gradeAddress(input.address, input.district);
  const nameG = gradeName(input.name);
  const emailG = gradeEmail(input.email);
  const amountG = gradeAmount(input.cartTotal);
  const historyG = gradeHistory(input.history);

  add("phone", WEIGHTS.phone, phoneG);
  add("address", WEIGHTS.address, addressG);
  add("name", WEIGHTS.name, nameG);
  add("email", WEIGHTS.email, emailG);
  add("amount", WEIGHTS.amount, amountG);
  add("history", WEIGHTS.history, historyG);

  let score = knownWeight > 0 ? (weightedSum / knownWeight) * 100 : 50;

  // ── সংযোজন (নতুন গ্রাহক হলে বাড়তি সতর্কতা) ──
  const adjustments: ScoreFactor[] = [];
  if (historyG.isNew && amountG.value !== null && amountG.value < 0.5) {
    adjustments.push({ module: "adjust", points: -8, reason: "নতুন গ্রাহক + বড় কার্ট — বাড়তি সতর্কতা" });
  }
  const hour = input.hourOfDay;
  if (historyG.isNew && addressG.noLandmark && addressG.value !== null && hour !== undefined && hour >= 2 && hour < 5) {
    adjustments.push({ module: "adjust", points: -6, reason: "নতুন গ্রাহক + গভীর রাত + ঠিকানায় স্পষ্ট চিহ্ন নেই" });
  }
  for (const a of adjustments) score += a.points;
  score = clamp(Math.round(score), 0, 100);

  // ── সংকেত ও ক্যাপ ──
  const flags: string[] = [];
  const caps: { cap: number; reason: string }[] = [];

  if (addressG.issue === "gibberish") {
    flags.push("gibberish_address");
    caps.push({ cap: CAPS.gibberish_address, reason: "ঠিকানা অর্থহীন মনে হওয়ায় স্কোরের সীমা" });
  } else if (addressG.issue === "refusal") {
    flags.push("refusal_text");
    caps.push({ cap: CAPS.gibberish_address, reason: "ঠিকানার ঘরে অর্ডার-বাতিলের লেখা থাকায় স্কোরের সীমা" });
  } else if (addressG.issue === "district_mismatch") {
    flags.push("district_mismatch");
    caps.push({ cap: CAPS.district_mismatch, reason: "ঠিকানা ও জেলা না মেলায় স্কোরের সীমা" });
  }
  if (addressG.value === null) {
    caps.push({ cap: CAPS.no_address, reason: "ঠিকানা না থাকায় স্কোর High-এর নিচে থাকবে" });
  }
  if (phoneG.value !== null && phoneG.value <= 0.15) {
    flags.push("suspicious_phone");
    caps.push({ cap: CAPS.suspicious_phone, reason: "সন্দেহজনক ফোন নম্বর প্যাটার্নের কারণে স্কোরের সীমা" });
  }
  if (emailG.disposable) {
    flags.push("disposable_email");
    caps.push({ cap: CAPS.disposable_email, reason: "সাময়িক ইমেইল ব্যবহারের কারণে স্কোরের সীমা" });
  }
  if (nameG.bad) {
    flags.push("bad_name");
    caps.push({ cap: CAPS.bad_name, reason: "নামটি অর্থহীন/অগ্রহণযোগ্য মনে হওয়ায় স্কোরের সীমা" });
  }

  // সবচেয়ে কড়া ক্যাপটাই প্রযোজ্য
  const binding = caps.sort((a, b) => a.cap - b.cap)[0];
  const afterAdjust = score;
  if (binding && score > binding.cap) score = binding.cap;
  const capDelta = score - afterAdjust;

  // নাম + ঠিকানা + ফোন একসাথে ভুয়া — সরাসরি junk
  const hardJunk = nameG.zero && addressG.value === 0 && phoneG.value !== null && phoneG.value <= 0.15;
  if (hardJunk) {
    flags.push("fake_identity");
    score = Math.min(score, 10);
  }

  const out: ScoreFactor[] = [...factors, ...adjustments];
  if (capDelta < 0 && binding) out.push({ module: "cap", points: capDelta, reason: `${binding.reason} (সর্বোচ্চ ${binding.cap})` });
  if (hardJunk) out.push({ module: "cap", points: Math.min(0, score - afterAdjust - capDelta), reason: "নাম, ঠিকানা ও ফোন তিনটাই ভুয়া মনে হচ্ছে" });

  return {
    score,
    confidence: Math.round((knownWeight / TOTAL_WEIGHT) * 100) / 100,
    factors: out,
    flags,
    hardJunk,
  };
}
