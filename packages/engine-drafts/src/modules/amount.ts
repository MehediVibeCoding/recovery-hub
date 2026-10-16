import type { Grade } from "./grade.ts";

const FULL_UNTIL = 5000; // এর নিচে পূর্ণ নম্বর
const LOW_AT = 10000; // এর ওপরে সর্বনিম্ন নম্বর

const bn = (n: number) => String(Math.round(n)).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/** কার্ট ০ বা অজানা হলে "তথ্য নেই" — আগের ইঞ্জিনের মতো ০ নম্বর নয় */
export function gradeAmount(cartTotal: number | undefined): Grade {
  if (cartTotal === undefined || !Number.isFinite(cartTotal) || cartTotal <= 0) {
    return { value: null, note: "কার্টের মূল্যের তথ্য নেই" };
  }
  if (cartTotal <= FULL_UNTIL) return { value: 1, note: `${bn(FULL_UNTIL)} টাকার নিচে` };
  if (cartTotal >= LOW_AT) return { value: 0.15, note: `${bn(LOW_AT)} টাকার বেশি — অগ্রিম নিশ্চিত করা ভালো` };
  const frac = (cartTotal - FULL_UNTIL) / (LOW_AT - FULL_UNTIL);
  return { value: 1 - frac * 0.85, note: `${bn(FULL_UNTIL)}–${bn(LOW_AT)} টাকার মাঝারি কার্ট` };
}
