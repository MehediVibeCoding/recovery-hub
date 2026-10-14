import type { ScoreFactor } from "../types.ts";

const MIN_USEFUL_LENGTH = 10;

// Very rough gibberish check: same character repeated, or no vowel-ish
// pattern at all. Deliberately conservative — false positives here would
// hide real (just terse) addresses.
function looksLikeGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4) return true;
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  return uniqueChars <= 2;
}

export function scoreAddress(address: string | undefined): ScoreFactor | null {
  if (!address) return null;

  if (looksLikeGibberish(address)) {
    return { module: "address", points: 0, reason: "ঠিকানাটি অর্থহীন মনে হচ্ছে" };
  }

  if (address.trim().length < MIN_USEFUL_LENGTH) {
    return { module: "address", points: 40, reason: "ঠিকানা খুবই ছোট/অসম্পূর্ণ" };
  }

  return { module: "address", points: 100, reason: "ঠিকানা ব্যবহারযোগ্য মনে হচ্ছে" };
}
