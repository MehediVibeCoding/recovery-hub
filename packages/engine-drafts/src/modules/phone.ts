import { DUMMY_PHONE_NUMBERS } from "../data/wordlists.ts";
import type { Grade } from "./grade.ts";

const DUMMY = new Set(DUMMY_PHONE_NUMBERS);

function maxRepeatRun(d: string): number {
  let best = 1;
  let cur = 1;
  for (let i = 1; i < d.length; i++) {
    cur = d[i] === d[i - 1] ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}

function hasShortRepeatPattern(d: string): boolean {
  for (const len of [1, 2, 3]) {
    const re = new RegExp(`^(\\d{${len}})\\1{${Math.ceil(6 / len)},}`);
    if (re.test(d)) return true;
  }
  return false;
}

function isSequential(d: string): boolean {
  let asc = 0;
  let desc = 0;
  for (let i = 1; i < d.length; i++) {
    if (+d[i] === +d[i - 1] + 1) asc++;
    if (+d[i] === +d[i - 1] - 1) desc++;
  }
  return asc >= d.length - 2 || desc >= d.length - 2;
}

function isMirrored(d: string): boolean {
  const half = Math.floor(d.length / 2);
  const a = d.slice(0, half);
  const b = d.slice(-half).split("").reverse().join("");
  return half >= 3 && a === b;
}

/** phoneNormalized = normalizeBdPhone-এর ফল (01[3-9]XXXXXXXX) */
export function gradePhone(phoneNormalized: string): Grade {
  if (DUMMY.has(phoneNormalized)) return { value: 0.05, note: "পরিচিত ডামি/টেস্ট নম্বর" };
  const last9 = phoneNormalized.slice(2);
  if (maxRepeatRun(last9) >= 6 || hasShortRepeatPattern(last9)) return { value: 0.1, note: "নম্বরে পুনরাবৃত্ত প্যাটার্ন" };
  if (isSequential(last9)) return { value: 0.15, note: "নম্বরে ক্রমিক অঙ্কের প্যাটার্ন (যেমন ১২৩৪৫৬৭৮)" };
  if (isMirrored(last9)) return { value: 0.2, note: "নম্বরে মিরর/উল্টো প্যাটার্ন" };
  return { value: 1, note: "বৈধ ফোন নম্বর" };
}
