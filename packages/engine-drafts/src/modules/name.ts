import { GENERIC_NAME_WORDS, PRANK_TEST_WORDS, PROFANITY_WORDS, containsAny, isEntirelyFrom } from "../data/wordlists.ts";
import { findGibberish, normalizeText, tokenize } from "../text.ts";
import type { Grade } from "./grade.ts";

const GIBBERISH_OPTS = { repeatRun: 3 };

export interface NameGrade extends Grade {
  /** নামটা স্পষ্টভাবে বাজে (অর্থহীন/গালি/টেস্ট) — স্কোর ক্যাপ ও fake-identity যাচাইয়ে লাগে */
  bad: boolean;
  /** পুরোপুরি অর্থহীন বা গালি (value ঠিক ০) */
  zero: boolean;
}

export function gradeName(nameRaw: string | undefined): NameGrade {
  const raw = normalizeText(nameRaw);
  if (!raw) return { value: null, note: "নাম দেওয়া হয়নি", bad: false, zero: false };

  const letters = raw.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return { value: 0.1, note: "নাম খুবই ছোট", bad: true, zero: false };

  const lower = raw.toLowerCase();
  if (containsAny(lower, PROFANITY_WORDS)) return { value: 0, note: "নামে অশ্লীল/গালিগালাজ শব্দ", bad: true, zero: true };

  // জেনেরিক ধরা হবে শুধু পুরো নামটাই জেনেরিক শব্দ হলে ("Customer", "ভাই") —
  // "আব্দুল মালিক" বা "Sana" যেন জেনেরিক না হয়ে যায়।
  if (isEntirelyFrom(lower, GENERIC_NAME_WORDS)) return { value: 0.15, note: "জেনেরিক নাম — আসল নাম না-ও হতে পারে", bad: false, zero: false };

  if (containsAny(lower, PRANK_TEST_WORDS)) return { value: 0.1, note: "টেস্ট/ফাজলামি লেখা নামে", bad: true, zero: false };

  const hits = findGibberish(tokenize(raw), GIBBERISH_OPTS);
  if (hits.length > 0) return { value: 0, note: `অর্থহীন লেখা ("${hits[0].token}")`, bad: true, zero: true };

  return { value: 1, note: "স্বাভাবিক নাম", bad: false, zero: false };
}
