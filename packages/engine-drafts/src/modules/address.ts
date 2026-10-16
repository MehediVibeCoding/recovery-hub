import { LANDMARK_WORDS, REFUSAL_WORDS, containsAny } from "../data/wordlists.ts";
import { analyzeGeo } from "../geo.ts";
import { findGibberish, normalizeText, tokenize } from "../text.ts";
import type { Grade } from "./grade.ts";

const GIBBERISH_OPTS = { repeatRun: 3 };

export type AddressIssue = "gibberish" | "refusal" | "short" | "district_mismatch";

export interface AddressGrade extends Grade {
  issue?: AddressIssue;
  /** বাসা/রাস্তা/এলাকার কোনো স্পষ্ট চিহ্ন নেই */
  noLandmark: boolean;
}

export function gradeAddress(addressRaw: string | undefined, district: string | undefined): AddressGrade {
  const raw = normalizeText(addressRaw);
  if (!raw) return { value: null, note: "ঠিকানা এখনো দেওয়া হয়নি", noLandmark: false };

  const compact = raw.replace(/[^\p{L}\p{N}]/gu, "");
  if (compact.length < 8) return { value: 0.15, note: "ঠিকানা খুবই ছোট/অসম্পূর্ণ", issue: "short", noLandmark: true };

  const lower = raw.toLowerCase();
  if (containsAny(lower, REFUSAL_WORDS)) {
    return { value: 0.05, note: "অর্ডার-বাতিলের ইঙ্গিত দেওয়া লেখা", issue: "refusal", noLandmark: true };
  }

  const tokens = tokenize(raw).filter((t) => t.length >= 3);
  const hits = findGibberish(tokens, GIBBERISH_OPTS);
  if (hits.length > 0) {
    // একটা মাত্র সন্দেহজনক শব্দ কিন্তু বাকি অনেক স্বাভাবিক শব্দ থাকলে (যেমন কোনো স্থানীয় বানান) ০ না দিয়ে কম দেওয়া
    const mostlyFine = hits.length === 1 && tokens.length >= 5;
    if (!mostlyFine) {
      return { value: 0, note: `অর্থহীন লেখা ("${hits[0].token}")`, issue: "gibberish", noLandmark: true };
    }
    return { value: 0.3, note: `একটা শব্দ অর্থহীন মনে হচ্ছে ("${hits[0].token}")`, noLandmark: false };
  }

  const geo = analyzeGeo(raw, district);
  const hasLandmark = !!containsAny(lower, LANDMARK_WORDS) || /\d/.test(raw);
  const districtKnown = !!geo.district || geo.claimedKnown;

  let value: number;
  let note: string;
  if (geo.union) { value = 1; note = `ইউনিয়ন পর্যন্ত স্পষ্ট মিল (${geo.union.bn})`; }
  else if (geo.upazila) { value = 0.85; note = `উপজেলা পর্যন্ত স্পষ্ট মিল (${geo.upazila.bn})`; }
  else if (hasLandmark && districtKnown) { value = 0.75; note = "বাসা/রাস্তা/এলাকার চিহ্ন আছে, জেলা পরিচিত"; }
  else if (hasLandmark) { value = 0.55; note = "ঠিকানায় বাসা/রাস্তার চিহ্ন আছে কিন্তু জেলা শনাক্ত হয়নি"; }
  else if (districtKnown) { value = 0.5; note = "শুধু জেলা পর্যন্ত — বাসা/রাস্তা/এলাকার স্পষ্ট চিহ্ন নেই"; }
  else { value = 0.35; note = "ঠিকানায় কোনো পরিচিত জেলা/এলাকা শনাক্ত হয়নি"; }

  const noLandmark = !hasLandmark && !geo.upazila;

  if (geo.districtMismatch) {
    return { value: Math.min(value, 0.35), note: "ঠিকানার লেখা আর নির্বাচিত জেলা মিলছে না", issue: "district_mismatch", noLandmark };
  }
  return { value, note, noLandmark };
}
