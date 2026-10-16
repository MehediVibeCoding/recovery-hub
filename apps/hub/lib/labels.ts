import type { PillTone } from "../components/common/Pill";
import type { Bucket, DraftStatus } from "./types";

export const STATUS_META: Record<DraftStatus, { label: string; tone: PillTone }> = {
  draft: { label: "Draft", tone: "amber" },
  contacted: { label: "Contacted", tone: "blue" },
  recovered: { label: "Recovered", tone: "green" },
  lost: { label: "Lost", tone: "gray" },
  invalid: { label: "Invalid", tone: "purple" },
  junk: { label: "Junk", tone: "red" },
};

export const BUCKET_META: Record<Bucket, { label: string; tone: PillTone; hint: string }> = {
  high: { label: "High", tone: "green", hint: "যোগাযোগের জন্য সেরা" },
  medium: { label: "Medium", tone: "blue", hint: "সাধারণ" },
  review: { label: "Review", tone: "amber", hint: "হাতে যাচাই দরকার" },
  junk: { label: "Junk", tone: "red", hint: "সম্ভবত ভুয়া/স্প্যাম" },
  no_contact: { label: "No contact", tone: "gray", hint: "বৈধ ফোন নেই" },
};

export const FLAG_LABELS: Record<string, string> = {
  no_phone: "ফোন নেই",
  blocklisted: "ব্লকলিস্টেড",
  allowlisted: "অ্যালাওলিস্টেড",
  repeat_returner: "বারবার রিটার্ন",
  courier_low_success: "কুরিয়ারে কম সফলতা",
  low_confidence: "কম কনফিডেন্স",
  low_score: "কম ট্রাস্ট স্কোর",
  gibberish_address: "ঠিকানা অর্থহীন",
  refusal_text: "ঠিকানায় বাতিলের লেখা",
  district_mismatch: "জেলা ও ঠিকানা মেলে না",
  bad_name: "নাম সন্দেহজনক",
  suspicious_phone: "ফোন নম্বর সন্দেহজনক",
  disposable_email: "সাময়িক ইমেইল",
  fake_identity: "ভুয়া পরিচয়",
};

// অর্ডার স্ট্যাটাস রং — Mehediadmin ORDER_STATUS_META-র পরিবার
export function orderStatusTone(s: string | null | undefined): PillTone {
  switch ((s ?? "").toLowerCase()) {
    case "pending":
      return "amber";
    case "confirmed":
      return "blue";
    case "shipped":
      return "purple";
    case "delivered":
      return "green";
    case "cancelled":
    case "canceled":
    case "returned":
    case "rejected":
      return "red";
    default:
      return "gray";
  }
}

export function paymentTone(s: string | null | undefined): PillTone {
  switch ((s ?? "").toLowerCase()) {
    case "paid":
    case "completed":
    case "success":
      return "green";
    case "partial":
    case "advance":
      return "amber";
    case "failed":
    case "refunded":
      return "red";
    case "unpaid":
    case "pending":
      return "gray";
    default:
      return "gray";
  }
}

export const AUDIT_LABELS: Record<string, string> = {
  "draft.status": "ড্রাফট স্ট্যাটাস বদল",
  "draft.note": "ড্রাফটে নোট",
  "draft.dnc_on": "ড্রাফট DNC চালু",
  "draft.dnc_off": "ড্রাফট DNC বন্ধ",
  "blocklist.add": "ব্লকলিস্টে যোগ",
  "allowlist.add": "অ্যালাওলিস্টে যোগ",
  "list_entry.remove": "লিস্ট থেকে সরানো",
  "rule.update": "রুল আপডেট",
  "settings.weights": "প্রায়োরিটি ওয়েট আপডেট",
  "settings.store": "স্টোর সেটিংস",
  "template.create": "টেমপ্লেট তৈরি",
  "template.update": "টেমপ্লেট আপডেট",
  "template.delete": "টেমপ্লেট মোছা",
  "template.enable": "টেমপ্লেট চালু",
  "template.disable": "টেমপ্লেট বন্ধ",
  "agent.config": "এজেন্ট কনফিগ আপডেট",
  "contact.dnc_on": "কন্টাক্ট DNC চালু",
  "contact.dnc_off": "কন্টাক্ট DNC বন্ধ",
  "api_key.enable": "API কী চালু",
  "api_key.disable": "API কী বন্ধ",
  export: "ডাটা এক্সপোর্ট",
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}
