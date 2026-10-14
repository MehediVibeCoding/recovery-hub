/**
 * Normalises a Bangladeshi mobile number to the canonical "01XXXXXXXXX" form.
 * Handles: Bengali digits, +8801..., 8801..., 01..., stray spaces/dashes,
 * and a missing leading zero (1XXXXXXXXX).
 * Returns null if it cannot be turned into a valid 11-digit 01-number.
 */

const BN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
}

export function normalizeBdPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = toEnglishDigits(raw).replace(/[^\d]/g, "");

  // Strip country code variants: 8801xxxxxxxxx / 008801xxxxxxxxx
  if (digits.startsWith("00880")) digits = digits.slice(3);
  if (digits.startsWith("880")) digits = digits.slice(2); // leaves 01xxxxxxxxx (11) or 1xxxxxxxxx (10)

  // Missing leading zero: 1xxxxxxxxx (10 digits, starts with 1) -> 01xxxxxxxxx
  if (digits.length === 10 && digits.startsWith("1")) {
    digits = "0" + digits;
  }

  // Must now be exactly 01[3-9]xxxxxxxx — 11 digits total
  if (!/^01[3-9]\d{8}$/.test(digits)) return null;

  return digits;
}
