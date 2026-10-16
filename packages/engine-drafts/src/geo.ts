// বাংলাদেশের জেলা/উপজেলা/ইউনিয়ন তালিকার সাথে ফ্রি-টেক্সট ঠিকানা মেলানো।
// উৎস ডেটা: data/bd-geo.ts (nuhil/bangladesh-geocode, MIT)।
//
// মেইন সাইটের geo.ts থেকে পার্থক্য: ঠিকানার ইংরেজি অংশ শব্দ ধরে মেলানো হয় (সব অক্ষর জুড়ে
// সাবস্ট্রিং নয়), তাই "pa bna" থেকে ভুল করে "pabna" ধরা পড়ে না। আর কাস্টমারের বাছা জেলা
// ঠিকানার লেখায় আছে কিনা দেখা হয় — ঠিকানায় অন্য জেলার নামও থাকলে (যেমন "ময়মনসিংহ রোড, ঢাকা")
// ভুল করে mismatch ধরা হয় না।

import { DISTRICTS, UNIONS, UPAZILAS } from "./data/bd-geo.ts";
import { bnKey, enKey } from "./text.ts";

interface Entry {
  id: number;
  parentId: number;
  en: string;
  bn: string;
  keyBn: string;
  keyEn: string;
}

function build(rows: [number, number, string, string][]): Entry[] {
  return rows.map(([id, parentId, en, bn]) => ({ id, parentId, en, bn, keyBn: bnKey(bn), keyEn: enKey(en) }));
}

const districtList = build(DISTRICTS);
const upazilaList = build(UPAZILAS);
const unionList = build(UNIONS);

const upazilaByDistrict = new Map<number, Entry[]>();
for (const e of upazilaList) {
  const arr = upazilaByDistrict.get(e.parentId) ?? [];
  arr.push(e);
  upazilaByDistrict.set(e.parentId, arr);
}
const unionByUpazila = new Map<number, Entry[]>();
for (const e of unionList) {
  const arr = unionByUpazila.get(e.parentId) ?? [];
  arr.push(e);
  unionByUpazila.set(e.parentId, arr);
}

export interface GeoMatch {
  en: string;
  bn: string;
  id: number;
}

/** ঠিকানার শব্দগুলো (১–৩ শব্দের জানালা) — ইংরেজি ও বাংলা আলাদা কী-সহ */
function windows(text: string): { bn: string; en: string }[] {
  const words = text
    .toLowerCase()
    .split(/[^\u0980-\u09FFa-z']+/)
    .filter(Boolean);
  const out: { bn: string; en: string }[] = [];
  for (let i = 0; i < words.length; i++) {
    for (let len = 1; len <= 3 && i + len <= words.length; len++) {
      const chunk = words.slice(i, i + len).join(" ");
      out.push({ bn: bnKey(chunk), en: enKey(chunk) });
    }
  }
  return out;
}

function findInText(text: string, list: Entry[]): Entry[] {
  if (list.length === 0) return [];
  const wins = windows(text);
  const found: Entry[] = [];
  for (const e of list) {
    const hit = wins.some((w) => {
      if (e.keyEn.length >= 3 && w.en === e.keyEn) return true;
      // বাংলায় বিভক্তি লাগে (ঢাকায়, চট্টগ্রামের) — তাই শুরু মিললে এবং বাড়তি ≤৩ অক্ষর হলে মিল
      if (e.keyBn.length >= 3 && w.bn.startsWith(e.keyBn) && w.bn.length - e.keyBn.length <= 3) return true;
      return false;
    });
    if (hit) found.push(e);
  }
  // লম্বা নাম আগে ("দক্ষিণ সুরমা" যেন শুধু "সুরমা"-র আগে আসে)
  return found.sort((a, b) => Math.max(b.bn.length, b.en.length) - Math.max(a.bn.length, a.en.length));
}

function resolveDistrict(claimed: string): Entry | undefined {
  const bk = bnKey(claimed);
  const ek = enKey(claimed);
  return districtList.find((d) => (bk && d.keyBn === bk) || (ek && d.keyEn === ek));
}

const toMatch = (e: Entry | undefined): GeoMatch | undefined => (e ? { en: e.en, bn: e.bn, id: e.id } : undefined);

export interface GeoAnalysis {
  /** ঠিকানার লেখায় জেলা পাওয়া গেছে (বা ফর্মের জেলা ঠিকানার লেখার সাথে মিলেছে) */
  district?: GeoMatch;
  upazila?: GeoMatch;
  union?: GeoMatch;
  /** ফর্মের জেলা চেনা গেছে (ড্রপডাউন) */
  claimedKnown: boolean;
  /** ঠিকানার লেখায় শুধু অন্য জেলার নাম আছে, ফর্মে বাছা জেলার নাম নেই */
  districtMismatch: boolean;
}

export function analyzeGeo(addressText: string, claimedDistrict?: string): GeoAnalysis {
  const claimed = claimedDistrict ? resolveDistrict(claimedDistrict) : undefined;
  const foundDistricts = findInText(addressText, districtList);

  const district = claimed ? foundDistricts.find((d) => d.id === claimed.id) : foundDistricts[0];
  const districtMismatch = !!claimed && foundDistricts.length > 0 && !district;

  // উপজেলা খোঁজা: ফর্মের জেলা চেনা গেলে সেটার ভেতরে, নইলে ঠিকানায় পাওয়া জেলার ভেতরে
  const scope = claimed ?? district;
  const upazila = scope && !districtMismatch ? findInText(addressText, upazilaByDistrict.get(scope.id) ?? [])[0] : undefined;
  // ইউনিয়ন: উপজেলা নিশ্চিত হলে তবেই (ছোট সাধারণ নামে ভুল মিল এড়াতে)
  const union = upazila ? findInText(addressText, unionByUpazila.get(upazila.id) ?? [])[0] : undefined;

  return {
    district: toMatch(district),
    upazila: toMatch(upazila),
    union: toMatch(union),
    claimedKnown: !!claimed,
    districtMismatch,
  };
}
