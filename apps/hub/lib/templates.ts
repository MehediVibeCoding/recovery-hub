// ক্লায়েন্ট ও সার্ভার দুই জায়গাতেই ব্যবহার হয় — "server-only" নেই।

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  enabled: boolean;
  is_default: boolean;
  updated_at: string;
}

export const TEMPLATE_VARS = [
  { key: "name", label: "গ্রাহকের নাম", sample: "রাকিব" },
  { key: "items", label: "পণ্যের নাম", sample: "লেদার ওয়ালেট" },
  { key: "total", label: "কার্ট টোটাল", sample: "৳1,250" },
  { key: "store", label: "স্টোরের নাম", sample: "Vangcur" },
  { key: "link", label: "চেকআউট লিংক", sample: "vangcur.com/c/ab12" },
] as const;

export const TEMPLATES_SETTING_KEY = "templates.sms";

export const DEFAULT_TEMPLATES: SmsTemplate[] = [
  {
    id: "tpl_reminder",
    name: "সাধারণ রিমাইন্ডার",
    body: "{name}, আপনার কার্টে {items} রয়ে গেছে ({total})। অর্ডার সম্পন্ন করতে: {link} — {store}",
    enabled: true,
    is_default: true,
    updated_at: new Date(0).toISOString(),
  },
  {
    id: "tpl_help",
    name: "সাহায্যের প্রস্তাব",
    body: "{name}, {store}-এ অর্ডার করতে কোনো সমস্যা হলে আমাদের জানান। আপনার কার্ট সংরক্ষিত আছে: {link}",
    enabled: false,
    is_default: false,
    updated_at: new Date(0).toISOString(),
  },
];

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export function sampleVars(): Record<string, string> {
  return Object.fromEntries(TEMPLATE_VARS.map((v) => [v.key, v.sample]));
}

export function unknownVars(body: string): string[] {
  const known = new Set<string>(TEMPLATE_VARS.map((v) => v.key));
  const found = new Set<string>();
  for (const m of body.matchAll(/\{(\w+)\}/g)) if (!known.has(m[1])) found.add(m[1]);
  return [...found];
}

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

/** SMS অংশ গণনা: GSM-7 হলে 160/153, বাংলা (UCS-2) হলে 70/67 */
export function smsSegments(text: string): { chars: number; encoding: "GSM-7" | "Unicode"; segments: number; perSegment: number } {
  let gsm = true;
  let units = 0;
  for (const ch of text) {
    if (GSM7.includes(ch)) units += 1;
    else if (GSM7_EXT.includes(ch)) units += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) {
    const segments = units === 0 ? 0 : units <= 160 ? 1 : Math.ceil(units / 153);
    return { chars: units, encoding: "GSM-7", segments, perSegment: units <= 160 ? 160 : 153 };
  }
  const len = text.length; // UTF-16 কোড ইউনিট
  const segments = len === 0 ? 0 : len <= 70 ? 1 : Math.ceil(len / 67);
  return { chars: len, encoding: "Unicode", segments, perSegment: len <= 70 ? 70 : 67 };
}
