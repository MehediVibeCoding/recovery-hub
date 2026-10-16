// বাংলাদেশি ই-কমার্সের বাস্তব প্যাটার্নের ভিত্তিতে শব্দতালিকা (মেইন সাইটের তালিকা থেকে নেওয়া)।
// ড্রাফটে যে ডেটা আসে না (বিকাশ ট্রানজেকশন, কুরিয়ার ব্রাঞ্চ) তার তালিকা ইচ্ছাকৃতভাবে বাদ।

/** ঠিকানায় থাকলে বোঝা যায় এটা একটা "খোঁজা-যায়-এমন" ঠিকানা — গ্রাম, শহর ও প্রাতিষ্ঠানিক */
export const LANDMARK_WORDS: string[] = [
  // গ্রাম/মফস্বল
  'গ্রাম', 'পাড়া', 'পূর্বপাড়া', 'পশ্চিমপাড়া', 'উত্তরপাড়া', 'দক্ষিণপাড়া', 'মধ্যপাড়া',
  'চক', 'চর', 'বিল', 'ডাঙ্গা', 'হাওর', 'বস্তি', 'পল্লী',
  'ডাকঘর', 'পোস্ট', 'পোষ্ট', 'ইউনিয়ন', 'ওয়ার্ড',
  'ঘাট', 'খেয়াঘাট', 'সাঁকো', 'বাঁধ', 'বেরিবাঁধ', 'মাঠ', 'ঈদগাহ', 'দীঘি', 'খালপাড়',
  'বটতলা', 'আমতলা', 'কদমতলা', 'তেঁতুলতলা',
  'মোড়', 'তিনরাস্তা', 'চৌরাস্তা', 'পাঁচমাথা', 'বাজার', 'হাট', 'স্ট্যান্ড',
  // শহর/উপশহর
  'বাড়ি', 'বাসা', 'রোড', 'রাস্তা', 'লেন', 'গলি', 'সড়ক', 'এভিনিউ',
  'ফ্ল্যাট', 'তলা', 'বিল্ডিং', 'ভবন', 'হাউজ', 'প্লট', 'হোল্ডিং', 'ব্লক', 'সেক্টর', 'ফেজ', 'মহল্লা',
  'হাউজিং', 'আবাসিক', 'কলোনি', 'কোয়ার্টার',
  // প্রাতিষ্ঠানিক
  'স্কুল', 'বিদ্যালয়', 'কলেজ', 'মাদ্রাসা', 'বিশ্ববিদ্যালয়', 'ভার্সিটি',
  'মসজিদ', 'মন্দির', 'গির্জা', 'মাজার',
  'মার্কেট', 'প্লাজা', 'কমপ্লেক্স', 'হাসপাতাল', 'ক্লিনিক', 'ফার্মেসি', 'ব্যাংক',
  'থানা', 'ফাঁড়ি', 'পাম্প', 'মিল', 'কারখানা', 'ফ্যাক্টরি',
  // Banglish / ইংরেজি
  'vill', 'village', 'gram', 'post', 'po', 'dakghor', 'upazila', 'thana', 'ps', 'dist', 'district',
  'para', 'bazar', 'bazaar', 'hat', 'mor', 'moor', 'stand', 'ghat', 'char',
  'house', 'road', 'rd', 'lane', 'goli', 'block', 'blk', 'sector', 'sec', 'flat', 'floor',
  'holding', 'plot', 'building', 'bhaban', 'tower', 'plaza', 'market', 'mkt', 'complex',
  'school', 'college', 'madrasa', 'mosque', 'masjid', 'hospital', 'pump', 'station',
];

/** নাম বা ঠিকানায় লেখা থাকলে বোঝা যায় এটা টেস্ট/ফাজলামি অর্ডার, আসল তথ্য না */
export const PRANK_TEST_WORDS: string[] = [
  'টেস্ট', 'চেক করছি', 'এমনি দেখলাম', 'ফাজলামি',
  'test', 'testing', 'trial', 'fake', 'dekhi', 'hudai', 'just checking',
];

/** কাস্টমার আসলে নিতে চায় না এমন ইঙ্গিত — ঠিকানা/নাম ফিল্ডে এলে সতর্কতা */
export const REFUSAL_WORDS: string[] = [
  'টাকা নাই', 'পাঠাবেন না', 'পাঠাইয়েন না', 'অর্ডার বাতিল', 'বাতিল করেন',
  'নিব না', 'কিনব না', 'কিনবো না', 'দরকার নাই', 'ভুলে হয়েছে', 'ভুল অর্ডার',
  'cancel', "don't send", 'dont send', 'kinbona', 'kinbo na', 'kenbona', 'bhul order',
];

/** কাস্টমার নিজের আসল নাম না লিখে সম্পর্কবাচক/জেনেরিক শব্দ লিখলে */
export const GENERIC_NAME_WORDS: string[] = [
  'ভাই', 'আপু', 'ক্রেতা', 'গ্রাহক', 'মালিক', 'স্যার', 'নাম বলব না',
  'customer', 'buyer', 'guest', 'sir', 'boss', 'mr x', 'unknown', 'anonymous', 'test user', 'n/a', 'na',
];

/** গালিগালাজ/অশ্লীল শব্দ — নাম বা ঠিকানায় এলে সরাসরি সন্দেহজনক (প্রাংক/হ্যারাসমেন্ট অর্ডারের লক্ষণ) */
export const PROFANITY_WORDS: string[] = [
  'মাগি', 'চুদা', 'চোদা', 'খানকি', 'মাদারচোদ', 'বাল', 'কুত্তা', 'হারামি', 'বেশ্যা',
  'chuda', 'khanki', 'madarchod', 'harami', 'bessha',
];

/** পরিচিত, বহুল-ব্যবহৃত ডামি মোবাইল নম্বর (সবগুলো ০১[৩-৯] ফরম্যাটে স্বাভাবিকীকরণের পর তুলনা হয়) */
export const DUMMY_PHONE_NUMBERS: string[] = [
  '01700000000', '01800000000', '01900000000', '01600000000', '01500000000', '01300000000', '01400000000',
  '01712345678', '01812345678', '01912345678', '01612345678', '01798765432', '01898765432',
  '01711122233', '01711223344', '01711111111', '01822222222', '01933333333',
];

const isLatinPhrase = (p: string) => /^[a-z0-9'’\-\/ ]+$/i.test(p);

function latinTokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(Boolean);
}

function bnTokens(s: string): string[] {
  return s.split(/[^\u0980-\u09FFa-z0-9]+/i).filter(Boolean);
}

/**
 * টেক্সটে তালিকার কোনো phrase আছে কিনা — ভুল-মিল (false positive) এড়াতে শব্দ-ভিত্তিক:
 * - ইংরেজি/Banglish phrase: পুরো শব্দ মিল। "sir" যেন "Sirajul"-এ, "test" যেন "Latest"-এ,
 *   "po" যেন "Pohela"-তে না মিলে। (মেইন সাইটের সাবস্ট্রিং মিলে এই ধরনের ভুল হতো।)
 * - বাংলা phrase: ৩ অক্ষর বা ছোট হলে পুরো শব্দ মিল ("বাল" যেন "ইকবাল"-এ না মিলে),
 *   লম্বা হলে সাবস্ট্রিং মিল (বিভক্তিসহ রূপও ধরতে)।
 */
export function containsAny(text: string, phrases: string[]): string | null {
  const lower = text.toLowerCase();
  const latin = latinTokens(lower);
  const latinSet = new Set(latin);
  const latinJoined = ` ${latin.join(" ")} `;
  const bn = new Set(bnTokens(lower));
  for (const p of phrases) {
    const pl = p.toLowerCase();
    if (isLatinPhrase(p)) {
      if (pl.includes(" ")) {
        if (latinJoined.includes(` ${latinTokens(pl).join(" ")} `)) return p;
      } else if (latinSet.has(pl.replace(/[^a-z']/g, ""))) {
        return p;
      }
    } else if ([...pl].length <= 3 && !pl.includes(" ")) {
      if (bn.has(pl)) return p;
    } else if (lower.includes(pl)) {
      return p;
    }
  }
  return null;
}

/** পুরো লেখাটাই (শব্দ ধরে) এই তালিকার শব্দ দিয়ে গঠিত কিনা — নাম "Customer"/"ভাই" টাইপ জেনেরিক কিনা দেখতে */
export function isEntirelyFrom(text: string, phrases: string[]): boolean {
  const norm = text.toLowerCase().replace(/[^\u0980-\u09FFa-z0-9' ]+/gi, " ").replace(/\s+/g, " ").trim();
  if (!norm) return false;
  const set = new Set(phrases.map((p) => p.toLowerCase()));
  if (set.has(norm)) return true;
  return norm.split(" ").every((t) => set.has(t));
}
