/**
 * Recovery Hub ড্রাফট স্কোরিং ইঞ্জিনের ইনপুট/আউটপুট।
 *
 * শুধু সেই ডেটাই আছে যা চেকআউট-ড্রাফটে সত্যিই আসে। অগ্রিম/বিকাশ, আইপি, লিমিট-হিট,
 * কুরিয়ার, honeypot — এগুলো ড্রাফটে আসে না বলে ইচ্ছাকৃতভাবে নেই (মেইন সাইটের অর্ডার-ইঞ্জিনে আছে)।
 */
export interface DraftInput {
  name?: string;
  phoneRaw?: string;
  email?: string;
  address?: string;
  district?: string;
  cartTotal?: number;
  hourOfDay?: number; // 0-23, Asia/Dhaka
  /** হাবের contacts টেবিল থেকে — একই ফোনের আগের অর্ডারের ফল */
  history?: { delivered: number; returned: number; cancelled: number };
}

export type TrustBucket = "junk" | "low" | "review" | "high" | "no_contact";

export type FactorTone = "good" | "warn" | "bad";

export interface ScoreFactor {
  module: string;
  /** এই ফ্যাক্টর থেকে পাওয়া নম্বর (ওজন × মান); সংযোজন/ক্যাপ-এর ক্ষেত্রে ঋণাত্মক হতে পারে */
  points: number;
  reason: string;
  /** এই ফ্যাক্টরের সর্বোচ্চ সম্ভাব্য নম্বর (ওজন); সংযোজন/ক্যাপ-এ নেই */
  max?: number;
  tone?: FactorTone;
}

export interface ScoreResult {
  score: number; // 0-100
  bucket: TrustBucket; // সাময়িক — চূড়ান্ত বাকেট Hub rule layer ঠিক করে
  confidence: number; // 0-1 — জানা ফ্যাক্টরের ওজন ÷ মোট ওজন
  phoneNormalized: string | null;
  factors: ScoreFactor[];
  /** সন্দেহজনক সংকেত (rule layer এগুলো দেখে বাকেট নামায়): gibberish_address, refusal_text,
   *  district_mismatch, bad_name, suspicious_phone, disposable_email, fake_identity */
  flags: string[];
  /** নাম + ঠিকানা + ফোন একসাথে ভুয়া — সরাসরি junk */
  hardJunk: boolean;
}
