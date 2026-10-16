import type { Grade } from "./grade.ts";

const bn = (n: number) => String(Math.round(n)).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export interface HistoryGrade extends Grade {
  isNew: boolean;
}

export function gradeHistory(h: { delivered: number; returned: number; cancelled: number } | undefined): HistoryGrade {
  const bad = (h?.returned ?? 0) + (h?.cancelled ?? 0);
  const delivered = h?.delivered ?? 0;
  if (!h || delivered + bad === 0) {
    // নতুন ফোন: নম্বর নেই (স্কোর/কনফিডেন্সে ধরা হয় না), কিন্তু "নতুন" সংকেতটা সংযোজন-নিয়মে কাজে লাগে
    return { value: null, note: "নতুন গ্রাহক — আগের কোনো অর্ডার-ইতিহাস নেই", isNew: true };
  }
  // শুধু ডেলিভারড ইতিহাস থাকলে মান নতুন গ্রাহকের (নিরপেক্ষ) চেয়ে কখনো কম হবে না
  // — প্রমাণিত ভালো গ্রাহক নতুনের চেয়ে কম স্কোর পেলে সেটা উল্টো ফল।
  // মিশ্র ইতিহাসে Bayesian smoothing (prior ১-১): অল্প ইতিহাসে চরম মান এড়ানো।
  const value =
    bad === 0
      ? Math.min(1, 0.85 + 0.05 * delivered)
      : Math.max(0, Math.min(1, (delivered + 1) / (delivered + bad + 2)));
  if (bad === 0) return { value, note: `আগে ${bn(delivered)}টা অর্ডার সফলভাবে ডেলিভারি হয়েছে`, isNew: false };
  if (value < 0.4) return { value, note: `আগে ${bn(bad)}টা রিটার্ন/বাতিল অর্ডার আছে`, isNew: false };
  return { value, note: `মিশ্র ইতিহাস — ${bn(delivered)}টা ডেলিভার্ড, ${bn(bad)}টা রিটার্ন/বাতিল`, isNew: false };
}
