import { DISPOSABLE_DOMAIN_LIST } from "../data/disposable-domains.ts";
import { looksRandomLocal, normalizeText } from "../text.ts";
import type { Grade } from "./grade.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISPOSABLE = new Set(DISPOSABLE_DOMAIN_LIST);
const TYPO_DOMAINS: Record<string, string> = {
  "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmial.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmil.com": "gmail.com", "gmaill.com": "gmail.com", "gnail.com": "gmail.com",
  "gmal.com": "gmail.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "yhoo.com": "yahoo.com", "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com", "outllook.com": "outlook.com",
};

export interface EmailGrade extends Grade {
  disposable: boolean;
}

export function gradeEmail(emailRaw: string | undefined): EmailGrade {
  const clean = normalizeText(emailRaw).toLowerCase();
  if (!clean) return { value: null, note: "কোনো ইমেইল দেওয়া হয়নি", disposable: false };
  if (!EMAIL_RE.test(clean)) return { value: 0.1, note: "ইমেইলের গঠন সঠিক নয়", disposable: false };

  const [local, domain] = clean.split("@");
  if (DISPOSABLE.has(domain)) return { value: 0, note: `সাময়িক/ফেক মেইল সার্ভিসের ইমেইল (${domain})`, disposable: true };
  if (TYPO_DOMAINS[domain]) return { value: 0.3, note: `ডোমেইনে বানান ভুল (${domain}) — ইমেইলটি কাজ করবে না`, disposable: false };
  if (looksRandomLocal(local, { repeatRun: 3 })) return { value: 0.35, note: "র‍্যান্ডম/জিবারিশ ইমেইল আইডি", disposable: false };
  return { value: 1, note: "সঠিক ফরম্যাটের ইমেইল", disposable: false };
}
